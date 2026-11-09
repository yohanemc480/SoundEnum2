import test from 'node:test';
import assert from 'node:assert/strict';
import { CompositionModel } from '../Scripts/Model/Composition/CompositionModel.ts';
import { SavedCompositionsModel, nextCompositionName } from '../Scripts/Model/Composition/SavedCompositionsModel.ts';
import { SavedCompositions } from '../Scripts/SavedCompositions.ts';

const row = { name: 'a', source: 'block', volume: 1.23, pitch: .75, minVolume: .1 };

test('composition edits are independent proposals, preserving duplicate rows and limits', () => {
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

test('saved model isolates copies, normalizes names and preserves identity on overwrite', () => {
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

test('saved limits reject growth while permitting repair of legacy oversized lists', () => {
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

test('saved-list persistence commits its model only after successful writes and respects read-only recovery', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const originalStorage = globalThis.localStorage, originalDocument = globalThis.document;
    const toast = { textContent: '', classList: { add() {}, remove() {} } };
    globalThis.document = { querySelector: () => toast };
    t.mock.method(console, 'error', () => {});
    let fail = true, writes = 0, saved;
    globalThis.localStorage = { setItem(_, value) { writes++; if (fail) throw new Error('quota'); saved = JSON.parse(value); } };
    try {
        const savedModel = new SavedCompositionsModel();
        const screen = Object.assign(Object.create(SavedCompositions.prototype), { model: savedModel, writable: true, render() {} });
        const items = savedModel.withAdded('one', 'test', '26.3', [row]);
        fail = true;
        assert.equal(screen.write(items), false);
        assert.equal(savedModel.read().length, 0);
        fail = false;
        assert.equal(screen.write(items), true);
        assert.deepEqual(savedModel.read(), saved);
        screen.writable = false;
        const beforeReadOnlyWrite = writes;
        assert.equal(screen.write([]), false);
        assert.equal(writes, beforeReadOnlyWrite);
    } finally {
        if (originalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalStorage;
        if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
    }
});
