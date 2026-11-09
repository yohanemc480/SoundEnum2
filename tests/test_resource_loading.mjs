import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSoundEvents, parseHashMap, parseDurations, parseSearchTags } from '../Scripts/Infrastructure/Resources/ParseResourceData.ts';
import { WorkerSearchService } from '../Scripts/Infrastructure/Search/WorkerSearchService.ts';
import { ResourcePathProvider } from '../Scripts/Infrastructure/Resources/ResourcePathProvider.ts';

test('検索・再生の前に不正なJSON構造を拒否する', () => {
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

test('Worker破棄時に保留中の要求を失敗させ、保留がなくても正常に終了する', async () => {
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

test('Workerへの送信に失敗した要求を保留一覧から除去する', async () => {
    const resource = new WorkerSearchService(new ResourcePathProvider('test'));
    resource.worker = { postMessage() { throw new Error('clone failed'); } };
    await assert.rejects(resource.search({}), /clone failed/);
    assert.equal(resource.pending.size, 0);
});


test('指定バージョンのIDだけを除外し、同じ音源の別IDは残して通常の検索条件も渡す', async t => {
    const service = new WorkerSearchService(new ResourcePathProvider('new'), ['old', 'new']);
    const results = [{ name: 'existing', candidate: { hash: 'same' } }, { name: 'added', candidate: { hash: 'same' } }];
    const requests = [], fetched = [];
    service.request = async request => { requests.push(request.options); return { results }; };
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        fetched.push({ url, options });
        return { ok: true, json: async () => ({ existing: { sounds: [] } }) };
    });
    const options = { query: 'bell', tags: ['metal'], referenceSoundName: 'base', excludedVersion: 'old' };
    assert.deepEqual((await service.search(options)).map(row => row.name), ['added']);
    assert.deepEqual(requests[0], options);
    await service.search(options);
    assert.equal(fetched.length, 1);
    assert.equal(fetched[0].url, 'resource/old/sound-events.json');
    assert.equal((await service.search({ ...options, excludedVersion: '' })).length, 2);
    service.dispose();
    assert.equal(fetched[0].options.signal.aborted, true);
});

test('除外元の取得失敗で未除外の結果を返さず、再試行できる', async t => {
    const service = new WorkerSearchService(new ResourcePathProvider('new'), ['old', 'new']);
    service.request = async () => ({ results: [{ name: 'existing' }] });
    let attempts = 0;
    t.mock.method(globalThis, 'fetch', async () => {
        if (++attempts === 1) return { ok: false, status: 404 };
        return { ok: true, json: async () => ({ existing: {} }) };
    });
    await assert.rejects(service.search({ excludedVersion: 'old' }), /404/);
    assert.deepEqual(await service.search({ excludedVersion: 'old' }), []);
    await assert.rejects(service.search({ excludedVersion: '../bad' }), /Unknown/);
    assert.equal(attempts, 2);
    service.dispose();
});
