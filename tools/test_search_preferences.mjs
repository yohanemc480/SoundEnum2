import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalStorage } from '../Scripts/LocalStorage.ts';
import { normalizePreferences } from '../Scripts/LocalStorageSchema.ts';
import { LocalBrowserPreferencesStore } from '../Scripts/Infrastructure/Storage/LocalBrowserPreferencesStore.ts';
import { StoredSearchPreferences } from '../Scripts/Infrastructure/Storage/StoredSearchPreferences.ts';
import { restoreSearchOptions, toSearchOptions } from '../Scripts/Model/Search/SearchPreferences.ts';
const preferences = new LocalBrowserPreferencesStore();
const searchPreferences = new StoredSearchPreferences(preferences);
const readPreferences = () => preferences.read();
const savePreferences = changes => preferences.update(changes);
const saveSearchOptions = options => searchPreferences.save(options);
const restoreSearchPreferences = (saved, index) => restoreSearchOptions(toSearchOptions(normalizePreferences(saved)), index);

test('renamed search options preserve stored keys, version and active tab', () => {
    let value = JSON.stringify({ version: '26.3', query: 'bell', base: 'old', tags: ['metal'],
        excludeMultiple: true, tab: 'favorites-tab' });
    globalThis.localStorage = { getItem: () => value, setItem: (_, next) => { value = next; } };
    try {
        const options = toSearchOptions(readPreferences());
        assert.equal(options.referenceSoundName, 'old');
        assert.equal(options.excludeMultipleCandidates, true);
        saveSearchOptions({ ...options, referenceSoundName: 'new', excludeMultipleCandidates: false });
        assert.deepEqual(JSON.parse(value), { version: '26.3', query: 'bell', base: 'new', tags: ['metal'],
            excludeMultiple: false, tab: 'favorites-tab' });
    } finally { delete globalThis.localStorage; }
});

test('preferences persist all fields and partial updates preserve search conditions', () => {
    let value = null;
    globalThis.localStorage = { getItem: () => value, setItem: (_, next) => { value = next; } };
    try {
        const state = { version: '26.3', query: 'bell', base: 'base', tags: ['metal'], excludeMultiple: true, tab: 'favorites-tab' };
        savePreferences(state);
        assert.deepEqual(readPreferences(), state);
        savePreferences({ version: '1.7.10' });
        assert.deepEqual(readPreferences(), { ...state, version: '1.7.10' });
    } finally { delete globalThis.localStorage; }
});
test('restoration removes unavailable base and tags while retaining other preferences', () => {
    const restored = restoreSearchPreferences({ query: 'bell', base: 'missing', tags: ['metal', 'old'], excludeMultiple: true, tab: 'favorites-tab' }, { events: [{ name: 'base' }], tags: [{ id: 'metal' }] });
    assert.equal(restored.referenceSoundName, '');
    assert.deepEqual(restored.tags, ['metal']);
    assert.equal(restored.query, 'bell');
    assert.equal(restored.excludeMultipleCandidates, true);
    assert.equal(restoreSearchPreferences({ base: 'base' }, { events: [{ name: 'base' }], tags: [] }).referenceSoundName, 'base');
});
test('malformed fields fall back to safe defaults', () => {
    assert.deepEqual(normalizePreferences(null), normalizePreferences());
    assert.deepEqual(normalizePreferences({ query: 1, tags: 'metal', tab: 'missing', excludeMultiple: 'true' }), normalizePreferences());
});

test('preference storage failures keep search usable and report warnings without changing saved data', t => {
    const warnings = []; t.mock.method(console, 'warn', (...args) => warnings.push(args));
    let value = '{', failWrite = false;
    const store = new LocalBrowserPreferencesStore(new LocalStorage({
        getItem: () => value,
        setItem: (_, next) => { if (failWrite) throw new Error('quota'); value = next; },
    }));
    assert.deepEqual(store.read(), normalizePreferences()); assert.equal(warnings.length, 1);
    value = JSON.stringify({ version: '26.3', query: 'before', tab: 'compositions-tab', tags: ['metal'] });
    const previous = value; failWrite = true;
    const search = new StoredSearchPreferences(store);
    assert.doesNotThrow(() => search.save({ ...search.read(), query: 'after' }));
    assert.equal(value, previous); assert.equal(warnings.length, 2);
    const copy = search.read(); copy.tags.push('changed');
    assert.deepEqual(search.read().tags, ['metal']);
});
