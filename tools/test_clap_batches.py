import unittest
import numpy as np
from build_similarity import encode_audio_batches


class BatchTests(unittest.TestCase):
    def test_batches_cross_files_and_preserve_weighted_results(self):
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

    def test_inference_errors_propagate(self):
        def fail(chunks):
            raise RuntimeError('inference failed')
        with self.assertRaisesRegex(RuntimeError, 'inference failed'):
            list(encode_audio_batches(['a'], lambda _: np.ones(2), fail, lambda v: v, 4, 3))

    def test_empty_queue_does_not_infer(self):
        self.assertEqual(list(encode_audio_batches([], None, None, None, 4, 3)), [])
