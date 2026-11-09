import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSoundEvents, parseHashMap, parseDurations, parseSearchTags } from '../Scripts/Infrastructure/Resources/ParseResourceData.ts';
import { WorkerSearchService } from '../Scripts/Infrastructure/Search/WorkerSearchService.ts';
import { ResourcePathProvider } from '../Scripts/Infrastructure/Resources/ResourcePathProvider.ts';

test('resource parsers reject malformed JSON shapes before search or playback', () => {
    assert.throws(() => parseSoundEvents({ event: { sounds: [{ name: 1 }] } }), /Invalid/);
    assert.throws(() => parseSoundEvents({ event: { sounds: [{ name: 'a', pitch: '2' }] } }), /Invalid/);
    const events = { event: { subtitle: 'label', sounds: ['a', { name: 'b', stream: true }] } };
    assert.deepEqual(parseSoundEvents(events).event, events.event);
    assert.throws(() => parseHashMap({ a: 'bad' }), /Invalid/);
    assert.throws(() => parseDurations({ a: -1 }), /Invalid/);
    assert.throws(() => parseSearchTags({ schemaVersion: 3 }), /Invalid/);
    const tags = { schemaVersion: 3, version: 'test', vectorHash: 'a'.repeat(64),
        tags: [{ id: 'water', textKey: 'tagWater' }], audioTags: { a: ['water'] } };
    assert.deepEqual(parseSearchTags(tags).audioTags.a, ['water']);
    assert.throws(() => parseSearchTags({ ...tags, audioTags: { a: [1] } }), /Invalid/);
});

test('worker disposal rejects outstanding requests and ignores no pending work', async () => {
    const resource = new WorkerSearchService(new ResourcePathProvider('test'));
    let stopped = false;
    resource.worker = { postMessage() {}, terminate() { stopped = true; } };
    const pending = resource.search({});
    resource.dispose();
    await assert.rejects(pending, /Search worker stopped/);
    assert.equal(stopped, true);
    assert.equal(resource.pending.size, 0);
    await assert.rejects(resource.search({}), /Worker unavailable/);
});

test('failed worker sends remove pending requests', async () => {
    const resource = new WorkerSearchService(new ResourcePathProvider('test'));
    resource.worker = { postMessage() { throw new Error('clone failed'); } };
    await assert.rejects(resource.search({}), /clone failed/);
    assert.equal(resource.pending.size, 0);
});
