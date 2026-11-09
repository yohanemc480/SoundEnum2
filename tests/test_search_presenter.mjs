import test from 'node:test';
import assert from 'node:assert/strict';
import { SearchPresenter } from '../Scripts/Presenter/SearchPresenter.ts';

const options = { query: '', tags: [], referenceSoundName: '', excludeMultipleCandidates: false };
const candidate = { name: 'raw', hash: 'a', pitch: 1, volume: 1, weight: 1, duration: 1, vectorRow: 0 };
const result = name => ({ name, candidate, candidateCount: 1, score: null, sameAudio: false, tags: [] });
const index = { schemaVersion: 3, version: 'test', tags: [{ id: 'metal' }], audioTags: { a: [] },
    events: ['reference', 'second'].map(name => ({ name, candidates: [candidate] })) };
const deferred = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function setup(overrides = {}) {
    const state = { pages: [], statuses: [], favorites: [], saved: [], calls: [], scheduled: [], notifications: [], stopped: 0, disposed: 0 };
    const view = {
        bind(actions) { state.actions = actions; return () => { state.unbound = true; }; },
        initialize(_, value) { state.initialOptions = value; },
        setOptions(value) { state.options = value; },
        setStatus(value) { state.statuses.push(value); },
        showPage(value) { state.pages.push(value); },
        showFavorites(rows, available) { state.favorites.push({ rows, available }); },
        activateSearchTab() { state.activated = true; },
    };
    const service = { load: async () => index, search: async () => [], dispose() { state.disposed++; }, ...overrides.service };
    const favorites = overrides.favorites === undefined ? { read: () => [], save() {} } : overrides.favorites;
    const presenter = new SearchPresenter(view, service, {
        read: () => overrides.options ?? options, save: value => state.saved.push(value),
    }, { setEvents(value) { state.events = value; }, add(name) { state.added = name; }, stop() { state.stopped++; } },
    { async play(value) { state.preview = value; } }, favorites, {
        schedule(callback, milliseconds) { const job = { callback, milliseconds, cancelled: false }; state.scheduled.push(job); return () => { job.cancelled = true; }; },
        confirmFavoriteRemoval: overrides.confirm ?? (async () => true),
        notifyFailure: operation => state.notifications.push(operation),
    });
    const change = query => state.actions.changeOptions({ ...options, query });
    const run = () => { const job = state.scheduled.at(-1); if (!job.cancelled) job.callback(); };
    return { state, service, presenter, change, run };
}

test('DOMなしで有効な検索条件を復元し、ページを切り替える', async () => {
    const h = setup({ options: { ...options, tags: ['metal', 'removed'], referenceSoundName: 'reference' },
        service: { search: async () => [result('reference'), ...Array.from({ length: 101 }, (_, i) => result(`sound${i}`))] } });
    await h.presenter.load();
    assert.deepEqual(h.state.initialOptions.tags, ['metal']);
    assert.equal(h.state.pages.at(-1).baseline.name, 'reference');
    assert.equal(h.state.pages.at(-1).total, 101);
    assert.equal(h.state.pages.at(-1).rows.length, 50);
    h.state.actions.changePage(1); h.state.actions.changePage(1); h.state.actions.changePage(1);
    assert.equal(h.state.pages.at(-1).pageIndex, 2);
    assert.equal(h.state.pages.at(-1).rows.length, 1);
    h.presenter.dispose();
});

test('入力時に保留応答を無効化し、待機時間や応答順の逆転で古い結果を表示しない', async () => {
    const h = setup(); await h.presenter.load();
    const first = deferred(), second = deferred();
    h.service.search = value => value.query === 'first' ? first.promise : second.promise;
    h.change('first'); h.run();
    const pageCount = h.state.pages.length;
    h.change('second');
    first.resolve([result('stale')]); await flush();
    assert.equal(h.state.pages.length, pageCount);
    assert.equal(h.state.scheduled.at(-1).milliseconds, 120);
    h.run(); second.resolve([result('latest')]); await flush();
    assert.equal(h.state.pages.at(-1).rows[0].name, 'latest');
    const old = deferred(), recent = deferred();
    h.service.search = value => value.query === 'old' ? old.promise : recent.promise;
    h.change('old'); h.run(); h.change('recent'); h.run();
    recent.resolve([result('recent')]); await flush();
    old.reject(new Error('late failure')); await flush();
    assert.equal(h.state.pages.at(-1).rows[0].name, 'recent');
    assert.equal(h.state.statuses.at(-1), 'ready');
    h.presenter.dispose();
});

test('読込失敗を再試行でき、不正な基準音を検索サービスへ渡さない', async () => {
    let loads = 0, searches = 0;
    const h = setup({ service: { load: async () => { if (++loads === 1) throw new Error('missing'); return index; },
        search: async () => { searches++; return []; } } });
    await h.presenter.load(); assert.equal(h.state.statuses.at(-1), 'missing');
    h.state.actions.retry(); await flush();
    assert.equal(h.state.statuses.at(-1), 'ready');
    h.state.actions.changeOptions({ ...options, referenceSoundName: 'unknown' }); h.run(); await flush();
    assert.equal(h.state.statuses.at(-1), 'invalid-base'); assert.equal(searches, 1);
    h.presenter.dispose();
});

test('検索失敗を再試行でき、クリア操作で全条件をリセットする', async () => {
    let fail = true;
    const h = setup({ service: { search: async () => { if (fail) throw new Error('failed'); return []; } } });
    await h.presenter.load(); assert.equal(h.state.statuses.at(-1), 'failure');
    fail = false; h.state.actions.retry(); await flush();
    assert.equal(h.state.statuses.at(-1), 'ready');
    h.change('query'); h.state.actions.clear(); await flush();
    assert.deepEqual(h.state.saved.at(-1), options);
    h.presenter.dispose();
});

test('類似検索・組み合わせ追加・試聴にはDOM要素ではなく値を渡す', async () => {
    const h = setup(); await h.presenter.searchSimilar('reference');
    assert.equal(h.state.activated, true);
    assert.equal(h.state.saved.at(-1).referenceSoundName, 'reference');
    h.state.actions.addToComposition('reference'); assert.equal(h.state.added, 'reference');
    const request = { name: 'reference', candidate: null };
    await h.presenter.preview(request);
    assert.equal(h.state.stopped, 1); assert.deepEqual(h.state.preview, request);
    h.presenter.dispose();
});

test('お気に入り操作の取消や保存失敗では表示状態を維持する', async () => {
    const favorites = { read: () => ['reference'], save() { throw new Error('storage'); } };
    const confirmation = deferred();
    const h = setup({ favorites, confirm: () => confirmation.promise }); await h.presenter.load();
    h.state.actions.toggleFavorite('reference'); confirmation.resolve(false); await flush();
    assert.deepEqual(h.state.notifications, []);
    h.state.actions.toggleFavorite('second'); await flush();
    assert.deepEqual(h.state.notifications, ['favorites']);
    assert.deepEqual(h.state.favorites.at(-1).rows.map(row => row.name), ['reference']);
    h.presenter.dispose();
});

test('お気に入りの読込失敗は他機能を妨げず、破損データを上書きしない', async () => {
    let writes = 0;
    const h = setup({ favorites: { read() { throw new Error('corrupt'); }, save() { writes++; } } });
    await h.presenter.load();
    assert.equal(h.state.statuses.at(-1), 'ready');
    assert.equal(h.state.favorites.at(-1).available, false);
    h.state.actions.toggleFavorite('reference'); await flush(); assert.equal(writes, 0);
    h.presenter.dispose();
});

test('お気に入りは保存成功後に表示し、不明な音も保持して古い確認結果を無視する', async () => {
    let saved = ['unavailable']; const confirmation = deferred();
    const h = setup({ favorites: { read: () => saved, save: value => { saved = [...value]; } }, confirm: () => confirmation.promise });
    await h.presenter.load(); assert.equal(h.state.favorites.at(-1).rows[0].candidateCount, 0);
    h.state.actions.toggleFavorite('reference'); await flush();
    assert.deepEqual(saved, ['unavailable', 'reference']);
    assert.deepEqual(h.state.favorites.at(-1).rows.map(row => row.name), saved);
    h.state.actions.toggleFavorite('reference'); h.state.actions.toggleFavorite('reference');
    h.presenter.dispose(); confirmation.resolve(true); await flush();
    assert.deepEqual(saved, ['unavailable', 'reference']);
});

test('破棄時に待機処理を取り消し、遅れた読込・検索結果を表示しない', async () => {
    const loading = deferred(); const h = setup({ service: { load: () => loading.promise } });
    const pending = h.presenter.load(); h.presenter.dispose(); loading.resolve(index); await pending;
    assert.equal(h.state.initialOptions, undefined); assert.equal(h.state.unbound, true);
    const search = deferred(); const h2 = setup(); await h2.presenter.load();
    h2.service.search = () => search.promise;
    h2.change('one'); h2.run(); h2.change('two'); h2.presenter.dispose();
    const count = h2.state.pages.length; search.resolve([result('late')]); await flush();
    assert.equal(h2.state.pages.length, count);
    assert.equal(h2.state.scheduled.at(-1).cancelled, true);
});
