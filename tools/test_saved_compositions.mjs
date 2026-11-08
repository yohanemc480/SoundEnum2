import { nextCompositionName } from '../Scripts/SavedCompositions.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSavedCompositions, normalizePreferences, normalizeCompositionName } from '../Scripts/LocalStorageSchema.js';

test('saved compositions copy settings, retain duplicate sounds and validate limits', () => {
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

test('composition names allow Japanese labels but reject markup and controls', () => {
    assert.equal(normalizeCompositionName('a'.repeat(20)), 'a'.repeat(20));
    assert.equal(normalizeCompositionName(' 爆発・サウンド_Ａ（１） '), '爆発・サウンド_A(1)');
    for (const name of ['<script>', 'a\nb', 'a\tb', 'a\u202Eb', 'a\u200Bb', ' ', 'a'.repeat(21)])
        assert.throws(() => normalizeCompositionName(name));
});

test('automatic names use the smallest available number including normalized names', () => {
    assert.equal(nextCompositionName([]), '組み合わせ(1)');
    assert.equal(nextCompositionName([{ name: '組み合わせ（1）' }, { name: '組み合わせ(3)' }, { name: '効果音' }]), '組み合わせ(2)');
    assert.equal(nextCompositionName([{ name: '組み合わせ(2)' }]), '組み合わせ(1)');
});
