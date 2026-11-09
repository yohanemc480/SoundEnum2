"""共有リソース保護と削除前の検証を確認する。"""
from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import remove_sounds as remover


class RemoveTests(unittest.TestCase):
    """一時リソースだけで削除処理を検証する。"""

    def setUp(self):
        """共有音・専用音・無関係な音を配置する。"""
        temporary = tempfile.TemporaryDirectory(dir=remover.ROOT)
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.resource = self.root / 'resource'
        self.hashes = [str(i) * 40 for i in range(4)]
        self.write('available-versions.json', ['new', 'old'])
        for version, hashes in [('old', self.hashes[:2]), ('new', self.hashes[1:3])]:
            self.write(f'{version}/audio-file-hashes.json',
                       {f'minecraft/sounds/{i}.ogg': h for i, h in enumerate(hashes)})
            self.write(f'{version}/sound-events.json', {})
            (self.resource / version / 'audio-embeddings.bin').write_bytes(b'vectors')
        (self.resource / 'audio').mkdir()
        for sha1 in self.hashes:
            (self.resource / 'audio' / f'{sha1}.ogg').write_bytes(b'audio')
        self.write('audio-durations.json', dict.fromkeys(self.hashes, 1))
        self.write('audio-waveform-peaks.json', {
            'schemaVersion': 1, 'bins': 256, 'waveforms': dict.fromkeys(self.hashes, [1])})

    def write(self, name, data):
        """テスト用JSONを保存する。"""
        remover.write_json(self.resource / name, data)

    def snapshot(self):
        """変更検出用に全ファイルの内容を取得する。"""
        return {p.relative_to(self.root): p.read_bytes() for p in self.root.rglob('*') if p.is_file()}

    def remove(self, version='old', apply=True):
        """表示を抑制して削除関数を呼ぶ。"""
        with redirect_stdout(io.StringIO()):
            remover.remove(version, root=self.root, apply=apply)

    def test_preview(self):
        before = self.snapshot()
        self.remove(apply=False)
        self.assertEqual(before, self.snapshot())

    def test_shared_and_unrelated_resources_survive(self):
        self.remove()
        self.assertFalse((self.resource / 'old').exists())
        self.assertEqual(json.loads((self.resource / 'available-versions.json').read_bytes()), ['new'])
        self.assertEqual({p.stem for p in (self.resource / 'audio').iterdir()}, set(self.hashes[1:]))
        self.assertEqual(set(json.loads((self.resource / 'audio-durations.json').read_bytes())), set(self.hashes[1:]))
        waves = json.loads((self.resource / 'audio-waveform-peaks.json').read_bytes())
        self.assertEqual(set(waves['waveforms']), set(self.hashes[1:]))
        self.assertEqual(waves['bins'], 256)

    def test_invalid_reference_aborts_without_changes(self):
        for invalid in ({}, [], {'minecraft/sounds/a.ogg': '../escape'}):
            self.write('new/audio-file-hashes.json', invalid)
            before = self.snapshot()
            with self.assertRaises(ValueError):
                self.remove()
            self.assertEqual(before, self.snapshot())

    def test_missing_reference_aborts_without_changes(self):
        (self.resource / 'new/audio-file-hashes.json').unlink()
        before = self.snapshot()
        with self.assertRaises(FileNotFoundError):
            self.remove()
        self.assertEqual(before, self.snapshot())

    def test_unregistered_version_is_protected(self):
        self.write('pending/audio-file-hashes.json', {'minecraft/sounds/a.ogg': self.hashes[0]})
        self.remove()
        self.assertTrue((self.resource / 'audio' / f'{self.hashes[0]}.ogg').exists())

    def test_invalid_and_last_version(self):
        before = self.snapshot()
        for version in ('../audio', 'missing'):
            with self.assertRaises((ValueError, FileNotFoundError)):
                self.remove(version)
        self.assertEqual(before, self.snapshot())
        self.write('available-versions.json', ['old'])
        before = self.snapshot()
        with self.assertRaises(ValueError):
            self.remove()
        self.assertEqual(before, self.snapshot())

    def test_retry_after_interruption(self):
        original = Path.unlink

        def fail_audio(path, *args, **kwargs):
            """一覧更新後の失敗を再現する。"""
            if path.suffix == '.ogg':
                raise OSError('simulated failure')
            return original(path, *args, **kwargs)

        with patch.object(Path, 'unlink', fail_audio), self.assertRaises(OSError):
            self.remove()
        self.remove()
        self.assertFalse((self.resource / 'old').exists())

    def test_batch_aggregates_once_and_removes_shared_target_audio(self):
        self.write('available-versions.json', ['new', 'old', 'older'])
        self.write('older/audio-file-hashes.json', {'minecraft/sounds/a.ogg': self.hashes[0]})
        before = self.snapshot()
        with redirect_stdout(io.StringIO()):
            remover.remove('old', 'older', root=self.root)
        self.assertEqual(before, self.snapshot())
        with patch.object(remover, 'read_hashes', wraps=remover.read_hashes) as read, \
             patch.object(remover, 'write_json', wraps=remover.write_json) as write, \
             redirect_stdout(io.StringIO()):
            remover.remove('old', 'older', 'old', root=self.root, apply=True)
        self.assertEqual([call.args[1] for call in read.call_args_list], ['old', 'older', 'new'])
        self.assertEqual(write.call_count, 3)
        self.assertFalse((self.resource / 'old').exists())
        self.assertFalse((self.resource / 'older').exists())
        self.assertEqual({p.stem for p in (self.resource / 'audio').iterdir()}, set(self.hashes[1:]))

    def test_invalid_batch_aborts_before_changes(self):
        for targets in [(), ('old', 'new'), ('old', 'missing'), ('old', '../escape')]:
            with self.subTest(targets=targets):
                before = self.snapshot()
                with redirect_stdout(io.StringIO()), self.assertRaises((ValueError, FileNotFoundError)):
                    remover.remove(*targets, root=self.root, apply=True)
                self.assertEqual(before, self.snapshot())


if __name__ == '__main__':
    unittest.main()
