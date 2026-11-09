import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalStorage } from '../Scripts/Infrastructure/Storage/LocalStorage.ts';

test('JSONを保存・復元し、未保存の値と全件削除を扱う', () => {
    const data = new Map();
    const store = new LocalStorage({ getItem: key => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, value), clear: () => data.clear() });
    assert.deepEqual(store.read('missing', []), []);
    store.write('favorites', ['block.anvil.destroy']);
    assert.equal(data.get('favorites'), '["block.anvil.destroy"]');
    assert.deepEqual(store.read('favorites'), ['block.anvil.destroy']);
    store.write('settings', { tab: 'favorites-tab' });
    assert.deepEqual(store.read('settings'), { tab: 'favorites-tab' });
    store.clear();
    assert.equal(data.size, 0);
});

test('不正なJSONとストレージエラーを呼び出し元へ伝える', () => {
    assert.throws(() => new LocalStorage({ getItem: () => '{' }).read('bad'), SyntaxError);
    const store = new LocalStorage({ setItem: () => { throw new Error('quota'); }, clear: () => { throw new Error('denied'); } });
    assert.throws(() => store.write('key', []), /quota/);
    assert.throws(() => store.clear(), /denied/);
});


test('読込・書込の両方で形式を検証し、失敗時に有効なデータを置き換えない', async () => {
    const { LocalStorageSchema } = await import('../Scripts/Infrastructure/Storage/LocalStorageSchema.ts');
    let value = null;
    const store = new LocalStorage({ getItem: () => value, setItem: (_, next) => { value = next; } });
    assert.deepEqual(store.readEntry(LocalStorageSchema.Favorites), []);
    store.writeEntry(LocalStorageSchema.Favorites, ['a', 'a']);
    assert.deepEqual(JSON.parse(value), ['a']);
    assert.throws(() => store.writeEntry(LocalStorageSchema.Favorites, [1]), /Invalid/);
    assert.deepEqual(JSON.parse(value), ['a']);
    value = '{}';
    assert.throws(() => store.readEntry(LocalStorageSchema.Favorites), /Invalid/);
    store.writeEntry(LocalStorageSchema.SearchPreferences, { query: 'bell', tags: ['metal', 1] });
    assert.deepEqual(store.readEntry(LocalStorageSchema.SearchPreferences), {
        version: '', query: 'bell', base: '', tags: ['metal'], excludeMultiple: false, tab: 'search-tab'
    });
});
