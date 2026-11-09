"""公開音声の変換・キャッシュ検証・元音源保護を確認する。"""
import hashlib
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import build_release_audio as release


class ReleaseAudioTests(unittest.TestCase):
    """実際のVorbisファイルを使って公開用変換の境界条件を検証する。"""

    def setUp(self):
        """短いテスト音源を、実際のSHA-1を使った名前で保存する。"""
        directory = tempfile.TemporaryDirectory(dir=release.ROOT)
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        source = self.root / 'source.ogg'
        t = np.arange(44100) / 44100
        sf.write(source, .3 * np.sin(2 * np.pi * 440 * t), 44100,
                 format='OGG', subtype='VORBIS', compression_level=0.1)
        self.original = source.read_bytes()
        self.source = source.rename(self.root / f'{hashlib.sha1(self.original).hexdigest()}.ogg')
        self.cache = self.root / 'cache'
        self.cache.mkdir()

    def test_変換後も長さと形式と元音源を維持する(self):
        target, metadata, cached = release.prepare_audio(self.source, self.cache, None)
        self.assertFalse(cached)
        self.assertLessEqual(metadata['bytes'], len(self.original))
        self.assertEqual(self.source.read_bytes(), self.original)
        original, converted = sf.info(self.source), sf.info(target)
        self.assertEqual((original.frames, original.channels, original.samplerate),
                         (converted.frames, converted.channels, converted.samplerate))

    def test_正常なキャッシュを再利用し破損時は再生成する(self):
        target, metadata, _ = release.prepare_audio(self.source, self.cache, None)
        with patch.object(release, 'transcode', wraps=release.transcode) as convert:
            self.assertTrue(release.prepare_audio(self.source, self.cache, metadata)[2])
            convert.assert_not_called()
            target.write_bytes(b'broken')
            self.assertFalse(release.prepare_audio(self.source, self.cache, metadata)[2])
            convert.assert_called_once()

    def test_ビルドはコードと依存定義が同じ場合だけキャッシュを再利用する(self):
        audio = self.root / 'resource' / 'audio'
        audio.mkdir(parents=True)
        self.source.rename(audio / self.source.name)
        (self.root / 'dist').mkdir()
        (self.root / 'dist' / 'index.html').write_text('test')
        script = self.root / 'build_release_audio.py'
        script.write_text('first implementation')
        requirements = self.root / 'requirements-release-audio.txt'
        requirements.write_text('first dependencies')
        with patch.object(release, '__file__', str(script)), patch.object(
            release, 'transcode', wraps=release.transcode,
        ) as convert:
            release.build(self.root)
            self.assertEqual(convert.call_count, 1)
            release.build(self.root)
            self.assertEqual(convert.call_count, 1)
            script.write_text('changed implementation')
            release.build(self.root)
            self.assertEqual(convert.call_count, 2)
            requirements.write_text('changed dependencies')
            release.build(self.root)
            self.assertEqual(convert.call_count, 3)
            release.build(self.root)
            self.assertEqual(convert.call_count, 3)

    def test_大きくなる場合は元音源を使う(self):
        def enlarge(source, destination):
            """サイズが増加する変換結果を模擬する。"""
            destination.write_bytes(source.read_bytes() + b'larger')

        with patch.object(release, 'transcode', side_effect=enlarge):
            target, metadata, _ = release.prepare_audio(self.source, self.cache, None)
        self.assertFalse(metadata['compressed'])
        self.assertEqual(target.read_bytes(), self.original)

    def test_元音源の破損はキャッシュがあっても検出する(self):
        _, metadata, _ = release.prepare_audio(self.source, self.cache, None)
        self.source.write_bytes(b'broken')
        with self.assertRaisesRegex(ValueError, 'hash mismatch'):
            release.prepare_audio(self.source, self.cache, metadata)


if __name__ == '__main__':
    unittest.main()
