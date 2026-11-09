import sys
from pathlib import Path

# 単体実行とunittestの自動検出の両方で更新ツールを読み込む。
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))

import unittest
import numpy as np
from build_similarity import encode_audio_batches


class BatchTests(unittest.TestCase):
    def test_ファイルをまたぐバッチでも重み付きの結果を維持する(self):
        audio = {'short': np.arange(2.), 'long': np.arange(11.), 'tail': np.arange(3.)}
        calls = []
        def infer(chunks):
            calls.append(len(chunks))
            return [np.array([chunk.sum() + 1, len(chunk)], dtype=float) for chunk in chunks]
        def normalize(v):
            return v / np.linalg.norm(v)
        result = dict(encode_audio_batches(audio, audio.__getitem__, infer, normalize, 4, 3))
        self.assertEqual(calls, [3, 2])
        for key, samples in audio.items():
            chunks = [samples[i:i + 4] for i in range(0, len(samples), 4)]
            expected = normalize(np.average([normalize(np.array([c.sum() + 1, len(c)])) for c in chunks], axis=0, weights=[len(c) for c in chunks]))
            np.testing.assert_allclose(result[key], expected)

    def test_推論エラーを呼び出し元へ伝える(self):
        def fail(chunks):
            raise RuntimeError('inference failed')
        with self.assertRaisesRegex(RuntimeError, 'inference failed'):
            list(encode_audio_batches(['a'], lambda _: np.ones(2), fail, lambda v: v, 4, 3))

    def test_空の入力では推論しない(self):
        self.assertEqual(list(encode_audio_batches([], None, None, None, 4, 3)), [])
