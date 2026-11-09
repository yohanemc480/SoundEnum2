import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePreferences } from '../Scripts/LocalStorageSchema.ts';
import { readPreferences, savePreferences, restoreSearchPreferences, toSearchOptions, saveSearchOptions } from '../Scripts/SearchPreferences.ts';

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
    assert.equal(restored.base, '');
    assert.deepEqual(restored.tags, ['metal']);
    assert.equal(restored.query, 'bell');
    assert.equal(restored.excludeMultiple, true);
    assert.equal(restored.tab, 'favorites-tab');
    assert.equal(restoreSearchPreferences({ base: 'base' }, { events: [{ name: 'base' }], tags: [] }).base, 'base');
});
test('malformed fields fall back to safe defaults', () => {
    assert.deepEqual(normalizePreferences(null), normalizePreferences());
    assert.deepEqual(normalizePreferences({ query: 1, tags: 'metal', tab: 'missing', excludeMultiple: 'true' }), normalizePreferences());
});
