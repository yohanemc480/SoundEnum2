import { ResourcePathProvider } from '../Scripts/ResourcePathProvider.ts';
import { selectResourceVersion } from '../Scripts/Model/Resources/ResourceVersions.ts';
import { buildSearchSounds } from '../Scripts/Model/Search/BuildSearchSounds.ts';
import { decodeSearchVectors } from '../Scripts/Model/Search/SearchVectors.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { searchSounds, validateSearchData } from '../Scripts/Model/Search/SoundSearchEngine.ts';
import { Text } from '../Scripts/Text.ts';
import { readFileSync } from 'node:fs';
import { resolveSoundEventReferences } from '../Scripts/Model/Search/ResolveSoundEventReferences.ts';

function fixture() {
    const hashes = ['a', 'b', 'c'].map(x => x.repeat(40));
    const candidate = row => ({ vectorRow: row, hash: hashes[row], name: 'raw' + row, pitch: 1, volume: 1, duration: row + 1 });
    return { schemaVersion: 3, version: 'test', generation: 'test', dimensions: 2, hashes,
        tags: [{ id: 'water' }, { id: 'metal' }], audioTags: Object.fromEntries(hashes.map((h, i) => [h, [['water'], ['metal'], ['water', 'metal']][i]])),
        events: [{ name: 'base', candidates: [candidate(0)] }, { name: 'shared', candidates: [candidate(0)] },
            { name: 'split', candidates: [candidate(0), candidate(1)] }, { name: 'both', candidates: [candidate(2)] }] };
}
const vectors = new Float32Array([1, 0, 0, 1, .6, .8]);
test('event aliases preserve nested pitch and volume without changing the source', () => {
    const events = { root: { sounds: [{ name: 'middle', type: 'event', pitch: 2 }] },
        middle: { sounds: [{ name: 'leaf', type: 'event', volume: .5 }] },
        leaf: { sounds: [{ name: 'minecraft:raw', pitch: .75 }] } };
    const before = JSON.stringify(events);
    const resolved = resolveSoundEventReferences(events);
    assert.equal(resolved.root[0].pitch, 1.5);
    assert.equal(resolved.root[0].volume, .5);
    assert.equal(resolved.root[0].name, 'raw');
    assert.equal(resolved.leaf[0].pitch, .75);
    assert.equal(JSON.stringify(events), before);
    assert.throws(() => resolveSoundEventReferences({ a: { sounds: [{ name: 'a', type: 'event' }] } }), /Circular/);
    assert.throws(() => resolveSoundEventReferences({ a: { sounds: [{ name: 'missing', type: 'event' }] } }), /Missing/);
});
test('AND matches one candidate, not a union across an event', () => {
    assert.deepEqual(searchSounds(fixture(), vectors, { tags: ['water', 'metal'] }).map(x => x.name), ['both']);
});
test('similarity puts the base first, marks shared audio, and chooses matching candidate', () => {
    const rows = searchSounds(fixture(), vectors, { referenceSoundName: 'base' });
    assert.equal(rows[0].name, 'base'); assert.equal(rows[0].score, 1);
    assert.equal(rows.find(x => x.name === 'shared').sameAudio, true);
    const sharedBase = searchSounds(fixture(), vectors, { referenceSoundName: 'shared' });
    assert.equal(sharedBase[0].name, 'shared');
    const filtered = searchSounds(fixture(), vectors, { referenceSoundName: 'base', tags: ['metal'] });
    assert.equal(filtered[0].name, 'both');
    assert.equal(filtered.find(x => x.name === 'split').candidate.vectorRow, 1);
});
test('unknown base fails', () => {
    assert.throws(() => searchSounds(fixture(), vectors, { referenceSoundName: 'missing' }));
});
test('tag filtering still finds a result beyond the first twenty neighbors', () => {
    const index = fixture();
    for (let i = 0; i < 30; i++) index.events.push({ name: `extra${i}`, candidates: [index.events[0].candidates[0]] });
    assert.equal(searchSounds(index, vectors, { referenceSoundName: 'base', tags: ['water', 'metal'] })[0].name, 'both');
});
test('data validation rejects wrong versions, invalid vectors and references', () => {
    validateSearchData(fixture(), vectors, 'test');
    assert.throws(() => validateSearchData(fixture(), vectors, 'other'));
    assert.throws(() => validateSearchData(fixture(), new Float32Array(6), 'test'));
    const broken = fixture(); broken.events[0].candidates[0].vectorRow = 99;
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
        await import('../Scripts/Infrastructure/Search/SoundSearchWorker.ts');
        const binary = encodeFixture();
        self.onmessage({ data: { type: 'init', id: 1, index: { ...fixture(), hashes: undefined, dimensions: undefined, events: fixture().events.map(e => ({ ...e, candidates: e.candidates.map(({ vectorRow, ...c }) => c) })) }, binary, version: 'test' } });
        assert.equal(messages.pop().ready, true);
        self.onmessage({ data: { type: 'search', id: 2, options: { referenceSoundName: 'base', tags: ['metal'] } } });
        const result = messages.pop();
        assert.equal(result.id, 2); assert.equal(result.results[0].name, 'both');
        self.onmessage({ data: { type: 'search', id: 3, options: { referenceSoundName: 'missing' } } });
        assert.equal(messages.pop().error, 'Unknown base sound');
        self.onmessage({ data: { type: 'init', id: 4, binary: new ArrayBuffer(0), index: {}, version: 'test' } });
        assert.equal(messages.pop().error, 'Invalid vector header');
        self.onmessage({ data: { type: 'search', id: 5, options: {} } });
        assert.equal(messages.pop().error, 'Search worker is not initialized');
    } finally { delete globalThis.self; }
});

function encodeFixture() {
    const index = fixture();
    const binary = new ArrayBuffer(16 + 3 * 28);
    const view = new DataView(binary);
    view.setUint32(0, 0x53455642, false);
    [1, 3, 2].forEach((v, i) => view.setUint32(4 + i * 4, v, true));
    index.hashes.forEach((hash, row) => {
        const offset = 16 + row * 28;
        for (let i = 0; i < 20; i++) view.setUint8(offset + i, parseInt(hash.slice(i * 2, i * 2 + 2), 16));
        for (let d = 0; d < 2; d++) view.setFloat32(offset + 20 + d * 4, vectors[row * 2 + d], true);
    });
    return binary;
}

test('binary identifies vectors and rejects corrupt headers, lengths and duplicates', () => {
    const decoded = decodeSearchVectors(encodeFixture());
    assert.deepEqual(decoded.hashes, fixture().hashes);
    assert.deepEqual(decoded.vectors, vectors);
    assert.throws(() => decodeSearchVectors(new ArrayBuffer(0)));
    assert.throws(() => decodeSearchVectors(encodeFixture().slice(0, -1)));
    const wrong = encodeFixture(); new DataView(wrong).setUint32(4, 99, true);
    assert.throws(() => decodeSearchVectors(wrong));
    const duplicate = encodeFixture();
    new Uint8Array(duplicate, 44, 20).set(new Uint8Array(duplicate, 16, 20));
    assert.throws(() => decodeSearchVectors(duplicate));
});

test('search candidates derive nested settings and durations from source resources', () => {
    const hash = 'a'.repeat(40);
    const sounds = { root: { sounds: [{ name: 'leaf', type: 'event', pitch: 2, volume: .5, weight: 3 }] },
        leaf: { sounds: [{ name: 'minecraft:raw', pitch: .5, volume: .4, weight: 2 }] }, empty: {} };
    const hashes = { 'minecraft/sounds/raw.ogg': hash };
    const events = buildSearchSounds(sounds, hashes, { [hash]: 6 });
    assert.equal(events.length, 2);
    assert.deepEqual(events.find(e => e.name === 'root').candidates[0],
        { name: 'raw', hash, pitch: 1, volume: .2, weight: 6, duration: 6 });
    assert.equal(events.find(e => e.name === 'leaf').candidates[0].duration, 12);
    assert.throws(() => buildSearchSounds(sounds, {}, { [hash]: 6 }));
    assert.throws(() => buildSearchSounds(sounds, hashes, {}));
});

test('version selection accepts only generated versions and falls back to default', () => {
    assert.equal(selectResourceVersion(['26.3'], null), '26.3');
    assert.equal(selectResourceVersion(['26.4', '26.3'], '26.3'), '26.3');
    assert.equal(selectResourceVersion(['26.4', '26.3'], '../other'), '26.4');
    assert.throws(() => selectResourceVersion([], null));
    assert.throws(() => selectResourceVersion(['../other'], null));
    assert.throws(() => selectResourceVersion(['26.3', '26.3'], null));
});

test('resource providers keep versions isolated and immutable', () => {
    const first = new ResourcePathProvider('26.3');
    const second = new ResourcePathProvider('26.4');
    assert.equal(first.Sounds, 'resource/26.3/sound-events.json');
    assert.equal(second.Sounds, 'resource/26.4/sound-events.json');
    assert.throws(() => { first.Version = '26.4'; });
    assert.equal(first.Sounds, 'resource/26.3/sound-events.json');
    assert.throws(() => new ResourcePathProvider('../other'));
});

test('exclude multiple checks original candidates before tag filtering', () => {
    const index = fixture();
    assert.ok(searchSounds(index, vectors, { tags: ['metal'] }).some(r => r.name === 'split'));
    assert.deepEqual(searchSounds(index, vectors, { tags: ['metal'], excludeMultipleCandidates: true }).map(r => r.name), ['both']);
    assert.ok(!searchSounds(index, vectors, { referenceSoundName: 'base', excludeMultipleCandidates: true }).some(r => r.name === 'split'));
    assert.ok(searchSounds(index, vectors, {}).some(r => r.name === 'split'));
});
