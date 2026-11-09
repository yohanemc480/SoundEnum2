import test from 'node:test';
import assert from 'node:assert/strict';
import { SavedCompositionsPresenter } from '../Scripts/Presenter/SavedCompositionsPresenter.ts';
import { LocalSavedCompositionsStore } from '../Scripts/Infrastructure/Storage/LocalSavedCompositionsStore.ts';
import { LocalStorageKey } from '../Scripts/Infrastructure/Storage/LocalStorageKey.ts';

const row = { name: 'a', source: 'block', volume: 1.25, pitch: .75, minVolume: .1 };
const item = { id: 'one', name: '効果音', version: '26.2', sounds: [row, row] };
/** 非同期ダイアログの応答と、それに続く描画まで待つ。 */
const flush = () => new Promise(resolve => setImmediate(resolve));

/** 確認・保存・編集画面を差し替え、DOMなしで操作全体を検証する。 */
function fixture(options = {}) {
    let actions, shown, listener, saved, writes = 0, revealed = 0, replaces = 0, ids = 0;
    let state = { rows: options.rows ?? [row], soundNames: options.soundNames === undefined ? ['a'] : options.soundNames };
    const notices = [], confirmations = [];
    const presenter = new SavedCompositionsPresenter({
        bind: value => { actions = value; return () => { actions = undefined; }; },
        show: value => { shown = value; }, revealSaved: () => { revealed++; },
    }, {
        read: () => { if (options.readFailure) throw new Error('invalid'); return structuredClone(options.items ?? [item]); },
        save: value => { writes++; if (options.writeFailure) throw new Error('quota'); saved = structuredClone(value); },
    }, {
        read: () => structuredClone(state), subscribeChanges: callback => { listener = callback; return () => { listener = undefined; }; },
        replace: value => { replaces++; if (options.replaceFailure) return false; state.rows = value; listener?.(); return true; },
    }, '26.3', {
        createId: () => `new${++ids}`, defaultName: n => `組み合わせ(${n})`,
        rename: async name => options.rename ? options.rename(name) : '新しい名前',
        confirm: async (operation, name) => { confirmations.push({ operation, name }); return options.confirm ? options.confirm(operation) : true; },
        notify: value => notices.push(value),
    });
    return { presenter, options, notices, confirmations,
        change: patch => { state = { ...state, ...patch }; listener?.(); },
        get actions() { return actions; }, get shown() { return shown; }, get saved() { return saved; },
        get writes() { return writes; }, get revealed() { return revealed; }, get state() { return state; },
        get replaces() { return replaces; }, get subscribed() { return !!listener; },
    };
}

test('保存・改名・上書き・削除でIDとバージョンを維持し、音設定のコピーを分離する', async () => {
    const f = fixture();
    assert.equal(f.shown.items[0].commands.length, 2);
    assert.match(f.shown.items[0].commands[0], /playsound minecraft:a block @a/);
    f.actions.save(); assert.equal(f.saved.length, 2); assert.equal(f.revealed, 1);
    assert.equal(f.saved[1].name, '組み合わせ(1)'); assert.equal(f.saved[1].version, '26.3');
    f.state.rows[0] = { ...row, pitch: 2 }; assert.equal(f.saved[1].sounds[0].pitch, .75);
    f.actions.rename('one'); await flush();
    assert.equal(f.saved[0].name, '新しい名前'); assert.equal(f.saved[0].version, '26.2');
    f.actions.overwrite('one'); await flush();
    assert.equal(f.saved[0].version, '26.3'); assert.equal(f.saved[0].id, 'one'); assert.equal(f.saved[0].name, '新しい名前');
    assert.equal(f.saved[0].sounds[0].pitch, 2);
    f.actions.remove('one'); await flush(); assert.deepEqual(f.saved.map(value => value.id), ['new1']);
    f.presenter.dispose();
});

test('書込失敗時は表示を維持し、読込失敗時は上書き、上限到達時は追加を禁止する', async () => {
    const f = fixture({ writeFailure: true });
    const before = f.shown;
    f.actions.rename('one'); await flush(); assert.equal(f.shown, before); assert.equal(f.notices.at(-1), 'failure');
    f.actions.save(); assert.equal(f.revealed, 0); assert.equal(f.shown.items.length, 1);
    f.presenter.dispose();
    const broken = fixture({ readFailure: true }); assert.equal(broken.shown.status, 'failure');
    broken.actions.save(); assert.equal(broken.writes, 0); broken.presenter.dispose();
    const full = fixture({ items: Array.from({ length: 30 }, (_, i) => ({ ...item, id: String(i) })) });
    full.actions.save(); assert.equal(full.writes, 0); assert.equal(full.notices.at(-1), 'limit');
    full.actions.remove('0'); await flush(); full.actions.save(); assert.equal(full.saved.length, 30); full.presenter.dispose();
});

test('呼び出す音の利用可否を確認し、編集中の行がある場合だけ確認して保存データを分離する', async () => {
    const f = fixture({ soundNames: null });
    assert.equal(f.shown.items[0].canLoad, false); assert.equal(f.shown.items[0].missing, false);
    f.actions.load('one'); await flush(); assert.equal(f.replaces, 0);
    f.change({ soundNames: [] }); assert.equal(f.shown.items[0].missing, true);
    f.change({ soundNames: ['a'] }); f.actions.load('one'); await flush();
    assert.equal(f.replaces, 1); assert.equal(f.confirmations[0].operation, 'load');
    f.state.rows[0].pitch = 2; assert.match(f.shown.items[0].commands[0], /0.75/);
    f.change({ rows: [] }); f.actions.load('one'); await flush();
    assert.equal(f.confirmations.length, 1); assert.equal(f.state.rows.length, 2);
    f.options.replaceFailure = true; f.change({ rows: [] }); f.actions.load('one'); await flush();
    assert.equal(f.state.rows.length, 0); assert.equal(f.notices.length, 0);
    f.presenter.dispose();
});

test('ダイアログの取消や編集中の変更があれば、新しい編集内容を上書きしない', async () => {
    const f = fixture({ confirm: () => false, rename: () => null });
    f.actions.rename('one'); f.actions.remove('one'); f.actions.overwrite('one'); f.actions.load('one'); await flush();
    assert.equal(f.writes, 0); assert.equal(f.replaces, 0);
    let resolve;
    f.options.confirm = () => new Promise(done => { resolve = done; });
    f.actions.overwrite('one'); f.change({ rows: [{ ...row, volume: 2 }] }); resolve(true); await flush();
    assert.equal(f.writes, 0);
    f.actions.load('one'); f.change({ rows: [{ ...row, volume: 3 }] }); resolve(true); await flush();
    assert.equal(f.replaces, 0); f.presenter.dispose();
});

test('一覧の変更・破棄時は確認待ちを無効化し、両方の購読を解除する', async () => {
    let finish;
    const f = fixture({ rename: () => new Promise(resolve => { finish = resolve; }) });
    f.actions.rename('one'); f.actions.remove('one'); await flush();
    finish('遅い名前'); await flush(); assert.equal(f.saved.length, 0); assert.equal(f.writes, 1);
    f.actions.save(); f.actions.rename('new1');
    const before = f.writes, displayed = f.shown; f.presenter.dispose();
    finish('破棄後'); await flush();
    assert.equal(f.writes, before); assert.equal(f.shown, displayed); assert.equal(f.actions, undefined); assert.equal(f.subscribed, false);
});

test('既存の保存キーと旧形式の既定値を維持し、破損データを拒否する', () => {
    const oldStorage = globalThis.localStorage;
    let saved = JSON.stringify([{ id: 'legacy', name: '旧形式', sounds: [{ name: 'a', volume: .5, pitch: 1 }] }]);
    const keys = [];
    globalThis.localStorage = { getItem: key => { keys.push(key); return saved; }, setItem: (key, value) => { keys.push(key); saved = value; } };
    try {
        const store = new LocalSavedCompositionsStore(); const restored = store.read();
        assert.equal(restored[0].version, ''); assert.equal(restored[0].sounds[0].source, 'master');
        assert.equal(restored[0].sounds[0].minVolume, 0);
        store.save(restored); assert.deepEqual(store.read(), restored);
        assert.ok(keys.every(key => key === LocalStorageKey.SavedCompositions));
        saved = '{'; assert.throws(() => store.read());
    } finally { if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage; }
});
