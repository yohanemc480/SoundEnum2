import { LocalStorage } from '../Scripts/LocalStorage.ts';
import { LocalFavoriteSoundsStore } from '../Scripts/Infrastructure/Storage/LocalFavoriteSoundsStore.ts';
import { FavoriteSounds } from '../Scripts/Model/Favorites/FavoriteSounds.ts';
import { LocalStorageKey } from '../Scripts/Constants/LocalStorageKey.ts';
import test from 'node:test';
import assert from 'node:assert/strict';

test('favorites persist names with the existing key and survive new instances', () => {
    let value = null; const keys = [];
    const storage = new LocalStorage({ getItem: key => { keys.push(key); return value; }, setItem: (key, next) => { keys.push(key); value = next; } });
    const store = new LocalFavoriteSoundsStore(storage), model = new FavoriteSounds();
    model.replace(store.read());
    const next = model.withToggled('block.anvil.destroy');
    assert.deepEqual(model.read(), []);
    store.save(next); model.replace(next);
    assert.deepEqual(JSON.parse(value), ['block.anvil.destroy']);
    const restored = new FavoriteSounds(); restored.replace(new LocalFavoriteSoundsStore(storage).read());
    assert.ok(restored.has('block.anvil.destroy'));
    store.save(restored.withToggled('block.anvil.destroy')); assert.deepEqual(JSON.parse(value), []);
    assert.ok(keys.every(key => key === LocalStorageKey.Favorites));
});

test('favorite model copies values and rejects invalid data without changing state', () => {
    const model = new FavoriteSounds(); const input = ['a', 'a', 'b']; model.replace(input);
    input.push('c'); const copy = model.read(); copy.push('d');
    assert.deepEqual(model.read(), ['a', 'b']);
    assert.deepEqual(model.withToggled('a'), ['b']);
    assert.throws(() => model.replace(['a', null]), /Invalid/); assert.deepEqual(model.read(), ['a', 'b']);
    assert.throws(() => new LocalFavoriteSoundsStore(new LocalStorage({ getItem: () => '{}' })).read(), /Invalid/);
});
