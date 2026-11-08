import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalStorage } from '../Scripts/LocalStorage.js';

test('JSON round trip, missing values, removal and full clear', () => {
    const data = new Map();
    const store = new LocalStorage({ getItem: key => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key), clear: () => data.clear() });
    assert.deepEqual(store.read('missing', []), []);
    store.write('favorites', ['block.anvil.destroy']);
    assert.equal(data.get('favorites'), '["block.anvil.destroy"]');
    assert.deepEqual(store.read('favorites'), ['block.anvil.destroy']);
    store.write('settings', { tab: 'favorites-tab' });
    store.remove('favorites');
    assert.equal(store.read('favorites'), null);
    assert.deepEqual(store.read('settings'), { tab: 'favorites-tab' });
    store.clear();
    assert.equal(data.size, 0);
});

test('malformed JSON and storage failures propagate to the caller', () => {
    assert.throws(() => new LocalStorage({ getItem: () => '{' }).read('bad'), SyntaxError);
    const store = new LocalStorage({ setItem: () => { throw new Error('quota'); }, clear: () => { throw new Error('denied'); } });
    assert.throws(() => store.write('key', []), /quota/);
    assert.throws(() => store.clear(), /denied/);
});
