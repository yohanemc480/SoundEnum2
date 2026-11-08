import test from 'node:test';
import assert from 'node:assert/strict';
import { searchSounds, validateSearchData } from '../Scripts/SoundSearchEngine.js';
import { Text } from '../Scripts/Text.js';
import { readFileSync } from 'node:fs';
import { resolveSoundEvents } from '../Scripts/ResolveSoundEvents.js';

function fixture() {
    const hashes = ['a', 'b', 'c'].map(x => x.repeat(40));
    const candidate = row => ({ row, hash: hashes[row], name: 'raw' + row, pitch: 1, volume: 1, duration: row + 1 });
    return { schemaVersion: 1, version: 'test', generation: 'test', dimensions: 2, hashes,
        tags: [{ id: 'water' }, { id: 'metal' }], audioTags: [['water'], ['metal'], ['water', 'metal']],
        events: [{ name: 'base', candidates: [candidate(0)] }, { name: 'shared', candidates: [candidate(0)] },
            { name: 'split', candidates: [candidate(0), candidate(1)] }, { name: 'both', candidates: [candidate(2)] }] };
}
const vectors = new Float32Array([1, 0, 0, 1, .6, .8]);
test('event aliases preserve nested pitch and volume without changing the source', () => {
    const events = { root: { sounds: [{ name: 'middle', type: 'event', pitch: 2 }] },
        middle: { sounds: [{ name: 'leaf', type: 'event', volume: .5 }] },
        leaf: { sounds: [{ name: 'minecraft:raw', pitch: .75 }] } };
    const before = JSON.stringify(events);
    const resolved = resolveSoundEvents(events);
    assert.equal(resolved.root[0].pitch, 1.5);
    assert.equal(resolved.root[0].volume, .5);
    assert.equal(resolved.root[0].name, 'raw');
    assert.equal(resolved.leaf[0].pitch, .75);
    assert.equal(JSON.stringify(events), before);
    assert.throws(() => resolveSoundEvents({ a: { sounds: [{ name: 'a', type: 'event' }] } }), /Circular/);
    assert.throws(() => resolveSoundEvents({ a: { sounds: [{ name: 'missing', type: 'event' }] } }), /Missing/);
});
test('AND matches one candidate, not a union across an event', () => {
    assert.deepEqual(searchSounds(fixture(), vectors, { tags: ['water', 'metal'] }).map(x => x.name), ['both']);
});
test('similarity excludes self, marks shared audio, and chooses matching candidate', () => {
    const rows = searchSounds(fixture(), vectors, { base: 'base' });
    assert.equal(rows[0].name, 'shared'); assert.equal(rows[0].sameAudio, true);
    assert.equal(rows[0].score, 1); assert.ok(!rows.some(x => x.name === 'base'));
    const filtered = searchSounds(fixture(), vectors, { base: 'base', tags: ['metal'] });
    assert.equal(filtered[0].name, 'both');
    assert.equal(filtered.find(x => x.name === 'split').candidate.row, 1);
});
test('all candidates must fit duration; unknown base fails', () => {
    assert.deepEqual(searchSounds(fixture(), vectors, { max: 1 }).map(x => x.name), ['base', 'shared']);
    assert.throws(() => searchSounds(fixture(), vectors, { base: 'missing' }));
});
test('tag filtering still finds a result beyond the first twenty neighbors', () => {
    const index = fixture();
    for (let i = 0; i < 30; i++) index.events.push({ name: `extra${i}`, candidates: [index.events[0].candidates[0]] });
    assert.equal(searchSounds(index, vectors, { base: 'base', tags: ['water', 'metal'] })[0].name, 'both');
});
test('data validation rejects wrong versions, invalid vectors and references', () => {
    validateSearchData(fixture(), vectors, 'test');
    assert.throws(() => validateSearchData(fixture(), vectors, 'other'));
    assert.throws(() => validateSearchData(fixture(), new Float32Array(6), 'test'));
    const broken = fixture(); broken.events[0].candidates[0].row = 99;
    assert.throws(() => validateSearchData(broken, vectors, 'test'));
});
test('UI text keys are ordered and HTML/tag labels exist', () => {
    assert.deepEqual(Object.keys(Text), Object.keys(Text).sort());
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    for (const [, key] of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) assert.ok(key in Text, key);
    const tags = JSON.parse(readFileSync(new URL('./sound-tags.json', import.meta.url), 'utf8'));
    for (const tag of tags) assert.equal(typeof Text[tag.textKey], 'string');
});

test('worker initializes little-endian vectors, searches and reports errors', async () => {
    const messages = [];
    globalThis.self = { postMessage: message => messages.push(message) };
    try {
        await import('../Scripts/SoundSearchWorker.js');
        const binary = new ArrayBuffer(vectors.length * 4);
        const view = new DataView(binary);
        vectors.forEach((value, i) => view.setFloat32(i * 4, value, true));
        self.onmessage({ data: { type: 'init', id: 1, index: fixture(), binary, version: 'test' } });
        assert.equal(messages.pop().ready, true);
        self.onmessage({ data: { type: 'search', id: 2, options: { base: 'base', tags: ['metal'] } } });
        const result = messages.pop();
        assert.equal(result.id, 2); assert.equal(result.results[0].name, 'both');
        self.onmessage({ data: { type: 'search', id: 3, options: { base: 'missing' } } });
        assert.equal(messages.pop().error, 'Unknown base sound');
    } finally { delete globalThis.self; }
});
