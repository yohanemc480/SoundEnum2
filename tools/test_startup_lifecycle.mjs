import test from 'node:test';
import assert from 'node:assert/strict';
import { DisposalScope } from '../Scripts/App/DisposalScope.ts';
import { fetchTextResource } from '../Scripts/Infrastructure/Resources/FetchTextResource.ts';

test('startup cleanup releases registered resources in reverse order exactly once', () => {
    const scope = new DisposalScope(), order = [];
    scope.defer(() => order.push('listeners'));
    const audio = { dispose: () => order.push('audio') }; assert.equal(scope.own(audio), audio);
    scope.own({ dispose: () => order.push('view') }); scope.dispose(); scope.dispose();
    assert.deepEqual(order, ['view', 'audio', 'listeners']); assert.throws(() => scope.throwIfDisposed(), /disposed/);
});

test('one broken disposer does not prevent other resources from being released', () => {
    const scope = new DisposalScope(), order = [];
    scope.defer(() => order.push('first'));
    scope.defer(() => { throw new Error('cleanup'); });
    scope.defer(() => order.push('last'));
    assert.throws(() => scope.dispose(), error => error instanceof AggregateError && error.errors[0].message === 'cleanup');
    assert.deepEqual(order, ['last', 'first']); assert.doesNotThrow(() => scope.dispose());
});

test('a resource arriving after shutdown is immediately released and cannot continue initialization', async () => {
    const scope = new DisposalScope(); let finish, released = 0;
    const pending = new Promise(resolve => { finish = resolve; });
    const initialization = pending.then(resource => scope.own(resource));
    scope.dispose(); finish({ dispose: () => released++ });
    await assert.rejects(initialization, /disposed/); assert.equal(released, 1);
});

test('startup resource fetch preserves text, rejects HTTP errors and supports shutdown cancellation', async t => {
    const controller = new AbortController();
    const mock = t.mock.method(globalThis, 'fetch', async (path, options) => {
        assert.equal(path, 'resource/example.json'); assert.equal(options.signal, controller.signal);
        return { ok: true, text: async () => '{"example":1}' };
    });
    assert.equal(await fetchTextResource('resource/example.json', controller.signal), '{"example":1}');
    mock.mock.mockImplementation(async () => ({ ok: false, status: 404 }));
    await assert.rejects(fetchTextResource('resource/example.json', controller.signal), /404/);
    mock.mock.mockImplementation((_, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    const pending = fetchTextResource('resource/example.json', controller.signal); controller.abort();
    await assert.rejects(pending, /aborted/);
});
