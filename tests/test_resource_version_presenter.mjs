import test from 'node:test';
import assert from 'node:assert/strict';
import { ResourceVersionPresenter } from '../Scripts/Presenter/ResourceVersionPresenter.ts';
import { BrowserResourceVersionNavigation } from '../Scripts/Infrastructure/Resources/BrowserResourceVersionNavigation.ts';
import { FetchResourceVersions } from '../Scripts/Infrastructure/Resources/FetchResourceVersions.ts';

/** ブラウザなしで選択と保存の順序を記録する。 */
function fixture(requested = null, load = async () => ['new', 'old']) {
    const state = { saved: [], shown: [], failures: 0, disposed: 0, calls: 0 };
    const presenter = new ResourceVersionPresenter({ bind: change => { state.change = change; return () => { state.change = undefined; }; },
        showLoading() {}, showVersions: (versions, selected) => state.shown.push({ versions, selected }), showFailure: () => state.failures++ },
        { load: () => { state.calls++; return load(); }, dispose: () => state.disposed++ },
        { read: () => ({ version: 'old' }), update: value => state.saved.push(value) },
        { requestedVersion: () => requested, navigate: version => { state.navigated = version; } });
    return { state, presenter };
}

test('保存値よりURLのバージョンを優先し、一覧にある版だけへ遷移する', async () => {
    for (const [requested, expected] of [[null, 'old'], ['new', 'new'], ['unknown', 'new'], ['', 'new']]) {
        const { state, presenter } = fixture(requested);
        const pending = presenter.load(); assert.equal(presenter.load(), pending); assert.equal(await pending, expected);
        assert.equal(state.calls, 1); assert.deepEqual(state.saved, [{ version: expected }]);
        state.change('invalid'); assert.equal(state.navigated, undefined);
        state.change('old'); assert.equal(state.navigated, 'old'); assert.deepEqual(state.saved.at(-1), { version: 'old' });
        presenter.dispose(); assert.equal(state.change, undefined);
    }
});

test('バージョン取得を再試行でき、不正な一覧を保存しない', async () => {
    let fail = true; const { state, presenter } = fixture(null, async () => fail ? ['same', 'same'] : ['new']);
    await assert.rejects(presenter.load(), /Invalid/); assert.equal(state.failures, 1); assert.equal(state.saved.length, 0);
    fail = false; assert.equal(await presenter.load(), 'new'); presenter.dispose();
    const failed = fixture(null, async () => { throw new Error('offline'); });
    await assert.rejects(failed.presenter.load(), /offline/); assert.equal(failed.state.failures, 1); failed.presenter.dispose();
});

test('破棄時に取得を中止し、遅れて届いた結果で表示や保存を更新しない', async () => {
    let finish; const { state, presenter } = fixture(null, () => new Promise(resolve => { finish = resolve; }));
    const pending = presenter.load(); presenter.dispose(); presenter.dispose(); finish(['new']);
    await assert.rejects(pending, /disposed/); assert.equal(state.disposed, 1);
    assert.equal(state.saved.length, 0); assert.equal(state.shown.length, 0); assert.equal(state.failures, 0);
});

test('バージョン変更時も他のクエリとフラグメントを保持する', () => {
    const old = globalThis.location; let destination;
    globalThis.location = { href: 'https://example.test/path?other=1&version=old#part', assign: value => { destination = value; } };
    try {
        const navigation = new BrowserResourceVersionNavigation(); assert.equal(navigation.requestedVersion(), 'old');
        navigation.navigate('new'); assert.equal(destination, 'https://example.test/path?other=1&version=new#part');
    } finally { if (old === undefined) delete globalThis.location; else globalThis.location = old; }
});

test('一覧取得はキャッシュを使わず、HTTPエラーを通知して中断できる', async t => {
    let options;
    t.mock.method(globalThis, 'fetch', async (url, request) => { assert.equal(url, 'resource/available-versions.json'); options = request; return { ok: false, status: 404 }; });
    const resources = new FetchResourceVersions(); await assert.rejects(resources.load(), /404/);
    assert.equal(options.cache, 'no-cache'); resources.dispose(); assert.equal(options.signal.aborted, true);
});
