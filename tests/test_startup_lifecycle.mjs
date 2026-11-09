import test from 'node:test';
import assert from 'node:assert/strict';
import { DisposalScope } from '../Scripts/App/DisposalScope.ts';
import { fetchTextResource } from '../Scripts/Infrastructure/Resources/FetchTextResource.ts';

test('登録済みリソースを逆順に一度だけ解放する', () => {
    const scope = new DisposalScope(), order = [];
    scope.defer(() => order.push('listeners'));
    const audio = { dispose: () => order.push('audio') }; assert.equal(scope.own(audio), audio);
    scope.own({ dispose: () => order.push('view') }); scope.dispose(); scope.dispose();
    assert.deepEqual(order, ['view', 'audio', 'listeners']); assert.throws(() => scope.throwIfDisposed(), /disposed/);
});

test('一つの解放処理が失敗しても残りの解放を続ける', () => {
    const scope = new DisposalScope(), order = [];
    scope.defer(() => order.push('first'));
    scope.defer(() => { throw new Error('cleanup'); });
    scope.defer(() => order.push('last'));
    assert.throws(() => scope.dispose(), error => error instanceof AggregateError && error.errors[0].message === 'cleanup');
    assert.deepEqual(order, ['last', 'first']); assert.doesNotThrow(() => scope.dispose());
});

test('終了後に届いたリソースを即座に解放し、初期化を続けない', async () => {
    const scope = new DisposalScope(); let finish, released = 0;
    const pending = new Promise(resolve => { finish = resolve; });
    const initialization = pending.then(resource => scope.own(resource));
    scope.dispose(); finish({ dispose: () => released++ });
    await assert.rejects(initialization, /disposed/); assert.equal(released, 1);
});

test('起動時の取得内容を維持し、HTTPエラーと終了時の通信中断を扱う', async t => {
    const controller = new AbortController();
    const mock = t.mock.method(globalThis, 'fetch', async (path, options) => {
        assert.equal(path, 'resource/example.json'); assert.equal(options.signal.aborted, false);
        return new Response('{"example":1}');
    });
    assert.equal(await fetchTextResource('resource/example.json', controller.signal), '{"example":1}');
    mock.mock.mockImplementation(async () => ({ ok: false, status: 404 }));
    await assert.rejects(fetchTextResource('resource/missing.json', controller.signal), /404/);
    mock.mock.mockImplementation((_, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    const pending = fetchTextResource('resource/pending.json', controller.signal); controller.abort();
    await assert.rejects(pending, /Aborted/);
});
