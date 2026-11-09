import test from 'node:test';
import assert from 'node:assert/strict';
import { CompositionModel } from '../Scripts/Model/Composition/CompositionModel.ts';
import { SavedCompositionsModel, nextCompositionName } from '../Scripts/Model/Composition/SavedCompositionsModel.ts';

const row = { name: 'a', source: 'block', volume: 1.23, pitch: .75, minVolume: .1 };

test('行編集は独立した変更案を返し、重複と件数制限を維持する', () => {
    const model = new CompositionModel();
    model.replace([row, row]);
    const changed = model.withSettings(1, { ...row, pitch: 1.5 });
    assert.equal(model.read()[1].pitch, .75);
    model.replace(changed);
    changed[1].pitch = 2;
    assert.deepEqual(model.read().map(value => value.pitch), [.75, 1.5]);
    const copy = model.read(); copy[0].name = 'different';
    assert.equal(model.read()[0].name, 'a');
    assert.equal(model.withoutRow(0)[0].pitch, 1.5);
    assert.throws(() => model.withoutRow(-1));
    assert.throws(() => model.withSettings(2, row));
    assert.throws(() => model.replace([{ ...row, pitch: 0 }]));
    assert.equal(model.read().length, 2);
    model.replace(Array(10).fill(row));
    assert.throws(() => model.withAdded(row));
    model.replace(Array(11).fill(row));
    model.replace(model.withoutRow(0));
    assert.equal(model.read().length, 10);
});

test('保存データのコピーを分離し、名前を正規化して上書き時のIDを維持する', () => {
    const model = new SavedCompositionsModel();
    const sounds = [{ ...row }, { ...row }];
    const added = model.withAdded('one', ' Ａ ', '26.3', sounds);
    assert.equal(model.read().length, 0);
    sounds[0].volume = 99;
    model.replace(added);
    added[0].sounds[0].volume = 88;
    assert.equal(model.read()[0].sounds[0].volume, 1.23);
    assert.equal(model.read()[0].name, 'A');
    model.replace(model.withSounds('one', [row], '26.4'));
    assert.deepEqual(model.read()[0], { id: 'one', name: 'A', version: '26.4', sounds: [row] });
    model.replace(model.withName('one', ' 効果音 '));
    assert.equal(model.read()[0].name, '効果音');
    assert.throws(() => model.withName('one', '<invalid>'));
    assert.throws(() => model.withSounds('one', [], '26.4'));
    assert.throws(() => model.withAdded('one', 'duplicate', '', [row]));
    assert.throws(() => model.withoutItem('missing'));
    assert.equal(model.withoutItem('one').length, 0);
    assert.equal(nextCompositionName([{ name: '組み合わせ（1）' }], n => `組み合わせ(${n})`), '組み合わせ(2)');
});

test('件数超過データの修復は許可し、新たな件数増加を拒否する', () => {
    const model = new SavedCompositionsModel();
    model.replace(Array.from({ length: 31 }, (_, i) => ({ id: String(i), name: `item${i}`, version: '', sounds: [row] })));
    assert.throws(() => model.withAdded('new', 'new', '', [row]));
    model.replace(model.withName('0', 'renamed'));
    model.replace(model.withoutItem('1'));
    assert.equal(model.read().length, 30);
    assert.throws(() => model.withAdded('new', 'new', '', [row]));
    model.replace(model.withoutItem('2'));
    model.replace(model.withAdded('new', 'new', '', [row]));
    assert.equal(model.read().length, 30);
});
