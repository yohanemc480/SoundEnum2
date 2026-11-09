import sys
from pathlib import Path

# 単体実行とunittestの自動検出の両方で更新ツールを読み込む。
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))

import unittest
from sound_search_data import assign_tags, resolve_events, validate_tags

HASH = 'a' * 40


class SearchDataTests(unittest.TestCase):
    def test_イベント参照の入れ子でも設定値を維持する(self):
        events = {'root': {'sounds': [{'name': 'middle', 'type': 'event', 'pitch': 2}]},
                  'middle': {'sounds': [{'name': 'leaf', 'type': 'event', 'volume': .5}]},
                  'leaf': {'sounds': ['test']}}
        result = resolve_events(events, {'minecraft/sounds/test.ogg': HASH}, {HASH: 4})
        self.assertEqual(result['root'][0]['pitch'], 2)
        self.assertEqual(result['root'][0]['volume'], .5)
        self.assertEqual(result['root'][0]['duration'], 2)
        self.assertEqual(result['leaf'][0]['duration'], 4)

    def test_循環参照と不足した音源を拒否する(self):
        with self.assertRaisesRegex(ValueError, 'Circular'):
            resolve_events({'a': {'sounds': [{'name': 'a', 'type': 'event'}]}}, {}, {})
        with self.assertRaisesRegex(ValueError, 'Missing asset'):
            resolve_events({'a': {'sounds': ['missing']}}, {}, {})
        with self.assertRaisesRegex(ValueError, 'Missing event'):
            resolve_events({'a': {'sounds': [{'name': 'missing', 'type': 'event'}]}}, {}, {})

    def test_タグの閾値と手動補正を反映する(self):
        tags = [{'id': 'water', 'threshold': .3, 'prompts': ['water']},
                {'id': 'metal', 'threshold': .4, 'prompts': ['metal']}]
        validate_tags(tags, {HASH: {'add': ['metal'], 'remove': ['water']}})
        self.assertEqual(assign_tags([.8, .1], tags, {'add': ['metal'], 'remove': ['water']}), ['metal'])
        self.assertEqual(assign_tags([.1, .1], tags, {}), [])
        with self.assertRaises(ValueError):
            validate_tags(tags, {HASH: {'add': ['metal'], 'remove': ['metal']}})
        with self.assertRaises(ValueError):
            validate_tags(tags, {HASH: {'add': ['unknown']}})


if __name__ == '__main__':
    unittest.main()
