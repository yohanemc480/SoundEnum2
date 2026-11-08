"""Version selection and publication ordering for resource updates."""
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import update_sounds as updater


class UpdateTests(unittest.TestCase):
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
                definition = root / "Scripts/Constants/SoundResourcePaths.js"
                definition.parent.mkdir(parents=True)
                original = b'static Version = "26.3";'
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
                expected = original if fails else b'static Version = "26.4";'
                self.assertEqual(definition.read_bytes(), expected)


if __name__ == "__main__":
    unittest.main()
