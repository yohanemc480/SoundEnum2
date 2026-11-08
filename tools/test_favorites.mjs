import test from 'node:test';
import assert from 'node:assert/strict';
import { Favorites } from '../Scripts/Favorites.js';

test('favorites persist only IDs and survive new instances', () => {
    let value = null;
    const storage = { getItem: () => value, setItem: (_, next) => { value = next; } };
    const first = new Favorites(storage);
    first.toggle('block.anvil.destroy');
    assert.deepEqual(JSON.parse(value), ['block.anvil.destroy']);
    const next = new Favorites(storage);
    assert.ok(next.names.has('block.anvil.destroy'));
    next.toggle('block.anvil.destroy');
    assert.deepEqual(JSON.parse(value), []);
});
test('failed writes preserve favorites and invalid data is rejected', () => {
    const favorites = new Favorites({ getItem: () => '["old"]', setItem: () => { throw new Error('full'); } });
    assert.throws(() => favorites.toggle('new'), /full/);
    assert.deepEqual([...favorites.names], ['old']);
    assert.throws(() => new Favorites({ getItem: () => '{}'}), /Invalid/);
});
