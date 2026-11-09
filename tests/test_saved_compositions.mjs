import { nextCompositionName as findNextCompositionName } from '../Scripts/Model/Composition/SavedCompositionsModel.ts';
import { Text } from '../Scripts/I18n/Text.ts';
/** 画面の日本語文言で採番する。 */
const nextCompositionName = items => findNextCompositionName(items, Text.savedCompositionDefaultName);
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSavedCompositions } from '../Scripts/Model/Composition/CompositionData.ts';
import { normalizePreferences } from '../Scripts/Model/Search/SearchPreferences.ts';
import { normalizeCompositionName } from '../Scripts/Model/Composition/CompositionData.ts';

test('保存した組み合わせの設定をコピーし、音の重複を保持して件数上限を検証する', () => {
    const row = { name: 'block.anvil.destroy', source: 'block', volume: .35, pitch: 1.2, minVolume: .1 };
    const input = [{ id: 'one', name: '  Test  ', sounds: [row, row] }];
    const saved = normalizeSavedCompositions(input);
    assert.equal(saved[0].name, 'Test');
    assert.equal(saved[0].version, '');
    assert.equal(normalizeSavedCompositions([{ ...input[0], version: '26.3' }])[0].version, '26.3');
    assert.deepEqual(saved[0].sounds, [row, row]);
    row.pitch = 2;
    assert.equal(saved[0].sounds[0].pitch, 1.2);
    assert.throws(() => normalizeSavedCompositions([{ ...input[0], sounds: Array(11).fill(row) }]));
    assert.throws(() => normalizeSavedCompositions([input[0], input[0]]));
    assert.equal(normalizePreferences({ tab: 'compositions-tab' }).tab, 'compositions-tab');
});

test('組み合わせ名は日本語を許可し、マークアップと制御文字を拒否する', () => {
    assert.equal(normalizeCompositionName('a'.repeat(20)), 'a'.repeat(20));
    assert.equal(normalizeCompositionName(' 爆発・サウンド_Ａ（１） '), '爆発・サウンド_A(1)');
    for (const name of ['<script>', 'a\nb', 'a\tb', 'a\u202Eb', 'a\u200Bb', ' ', 'a'.repeat(21)])
        assert.throws(() => normalizeCompositionName(name));
});

test('自動命名は正規化した名前も考慮して最小の空き番号を使う', () => {
    assert.equal(nextCompositionName([]), '組み合わせ(1)');
    assert.equal(nextCompositionName([{ name: '組み合わせ（1）' }, { name: '組み合わせ(3)' }, { name: '効果音' }]), '組み合わせ(2)');
    assert.equal(nextCompositionName([{ name: '組み合わせ(2)' }]), '組み合わせ(1)');
});
