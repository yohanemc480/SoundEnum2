"""Version selection and publication ordering for resource updates."""
import io
import threading
from contextlib import redirect_stdout
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import update_sounds as updater


class UpdateTests(unittest.TestCase):
    def test_parallel_download_progress_and_cache(self):
        hashes = [f"{i:040x}" for i in range(5)]
        barrier = threading.Barrier(4)
        downloaded = []
        lock = threading.Lock()

        def download(path, sha1, size):
            barrier.wait(timeout=5)
            with lock:
                downloaded.append(sha1)

        with tempfile.TemporaryDirectory(dir=updater.ROOT) as directory:
            root = Path(directory).resolve()
            assert root.is_relative_to(updater.ROOT.resolve())
            output = io.StringIO()
            with patch.object(updater, 'collect_audio_assets', return_value=dict.fromkeys(hashes, 10)), \
                 patch.object(updater, 'audio_file_is_valid', side_effect=lambda p, h, s: h == hashes[0]), \
                 patch.object(updater, 'download_audio_file', side_effect=download), redirect_stdout(output):
                updater.save_audio_files(root, b'{}')
            self.assertCountEqual(downloaded, hashes[1:])
            self.assertIn('100% 4/4 (cached: 1)', output.getvalue())
            self.assertEqual(output.getvalue().count('\n'), 1)
            for sha1 in hashes:
                self.assertNotIn(sha1, output.getvalue())

    def test_download_failure_propagates(self):
        with tempfile.TemporaryDirectory(dir=updater.ROOT) as directory:
            root = Path(directory).resolve()
            assert root.is_relative_to(updater.ROOT.resolve())
            with patch.object(updater, 'collect_audio_assets', return_value={'a' * 40: 10}), \
                 patch.object(updater, 'audio_file_is_valid', return_value=False), \
                 patch.object(updater, 'download_audio_file', side_effect=OSError('download failed')), \
                 redirect_stdout(io.StringIO()):
                with self.assertRaises(OSError):
                    updater.save_audio_files(root, b'{}')

    def test_versions_follow_release_dates_not_generation_or_name_order(self):
        entries = [
            {'id': '1.7.10', 'releaseTime': '2014-06-26T00:00:00+00:00'},
            {'id': '26.3', 'releaseTime': '2026-09-01T00:00:00+00:00'},
            {'id': '1.10', 'releaseTime': '2016-06-08T00:00:00+00:00'},
            {'id': '1.9', 'releaseTime': '2016-02-29T00:00:00+00:00'},
        ]
        with patch.object(updater, 'download_json', return_value=({'versions': entries}, b'')):
            self.assertEqual(updater.sort_available_versions(['1.7.10', '1.9', '26.3', '1.10']),
                             ['26.3', '1.10', '1.9', '1.7.10'])

    def test_explicit_version(self):
        entries = [{"id": "26.3"}, {"id": "26.4"}]
        with patch.object(updater, "download_json", return_value=({"versions": entries}, b"")):
            self.assertEqual(updater.fetch_version("26.3"), entries[0])
            with self.assertRaises(ValueError):
                updater.fetch_version("missing")
        with patch.object(updater, "download_json") as download:
            with self.assertRaises(ValueError):
                updater.fetch_version("../escape")
            download.assert_not_called()

    def test_switch_only_after_search_success(self):
        for fails in (False, True):
            with self.subTest(fails=fails), tempfile.TemporaryDirectory(dir=updater.ROOT) as directory:
                root = Path(directory).resolve()
                assert root.is_relative_to(updater.ROOT.resolve())
                definition = root / "resource/available-versions.json"
                definition.parent.mkdir(parents=True)
                original = b'["26.3"]'
                definition.write_bytes(original)

                def generate(command, **kwargs):
                    self.assertEqual(command[-1], "26.4")
                    self.assertEqual(command[0], updater.sys.executable)
                    self.assertTrue(kwargs["check"])
                    self.assertEqual(definition.read_bytes(), original)
                    self.assertTrue((root / "resource/26.4/sound-events.json").is_file())
                    if fails:
                        raise subprocess.CalledProcessError(1, command)

                with patch.object(updater, "fetch_version", return_value={"id": "26.4"}), \
                     patch.object(updater, "sort_available_versions", return_value=["26.4", "26.3"]), \
                     patch.object(updater, "fetch_sound_resources", return_value=({"hash": b"{}", "sounds": b"{}"}, b"{}")), \
                     patch.object(updater, "save_audio_files"), \
                     patch.object(updater, "build_durations"), \
                     patch.object(updater, "build_waveforms"), \
                     patch.object(updater.subprocess, "run", side_effect=generate) as run:
                    if fails:
                        with self.assertRaises(subprocess.CalledProcessError):
                            updater.update("26.4", root)
                    else:
                        updater.update("26.4", root)
                    run.assert_called_once()
                expected = ['26.3'] if fails else ['26.4', '26.3']
                self.assertEqual(json.loads(definition.read_bytes()), expected)


if __name__ == "__main__":
    unittest.main()
