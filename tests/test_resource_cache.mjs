import test from 'node:test';
import assert from 'node:assert/strict';
import { ResourceCache, resourceCache, fetchJsonResource } from '../Scripts/Infrastructure/Resources/ResourceCache.ts';
import { fetchTextResource } from '../Scripts/Infrastructure/Resources/FetchTextResource.ts';

test('同時取得を共有し、一人の中断では他の利用者を止めない', async t => {
    const cache = new ResourceCache(100);
    let finish, signal, calls = 0;
    t.mock.method(globalThis, 'fetch', (_, options) => {
        calls++; signal = options.signal;
        return new Promise(resolve => { finish = resolve; });
    });
    const controller = new AbortController();
    const first = cache.load('/shared', controller.signal);
    const second = cache.load('/shared');
    controller.abort();
    await assert.rejects(first, { name: 'AbortError' });
    assert.equal(signal.aborted, false);
    finish(new Response('abc'));
    const bytes = await second;
    structuredClone(bytes, { transfer: [bytes] });
    assert.equal(new TextDecoder().decode(await cache.load('/shared')), 'abc');
    assert.equal(calls, 1);
});

test('全員が中断した通信と失敗した取得は再試行できる', async t => {
    const cache = new ResourceCache(100);
    let signal, calls = 0;
    t.mock.method(globalThis, 'fetch', (_, options) => {
        calls++; signal = options.signal;
        if (calls === 1) return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
        return Promise.resolve(new Response('ok', { status: calls === 2 ? 500 : 200 }));
    });
    const controller = new AbortController();
    const pending = cache.load('/retry', controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' });
    assert.equal(signal.aborted, true);
    await assert.rejects(cache.load('/retry'), /500/);
    assert.equal(new TextDecoder().decode(await cache.load('/retry')), 'ok');
    assert.equal(calls, 3);
});

test('容量または件数の上限を超えると古い取得結果を解放する', async t => {
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('abc'); });
    for (const cache of [new ResourceCache(6), new ResourceCache(100, 2)]) {
        await cache.load('/a'); await cache.load('/b'); await cache.load('/a');
        await cache.load('/c'); await cache.load('/a');
        assert.equal(calls % 4, 3);
        await cache.load('/b');
        assert.equal(calls % 4, 0);
    }
});

test('起動時のテキスト取得と検索のJSON取得が共有され、不正JSONは再試行できる', async t => {
    resourceCache.clear(); t.after(() => resourceCache.clear());
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response(calls === 2 ? '{' : '{"value":1}'); });
    assert.equal(await fetchTextResource('/metadata'), '{"value":1}');
    assert.deepEqual(await fetchJsonResource('/metadata'), { value: 1 });
    assert.equal(calls, 1);
    await assert.rejects(fetchJsonResource('/broken'), SyntaxError);
    assert.deepEqual(await fetchJsonResource('/broken'), { value: 1 });
    assert.equal(calls, 3);
});
