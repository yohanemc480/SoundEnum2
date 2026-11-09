import test from 'node:test';
import assert from 'node:assert/strict';
// Viewの要素型定義だけを読み込むため、Nodeに存在しないDOMコンストラクターを補う。
const elementTypes = ['HTMLFieldSetElement', 'HTMLFormElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLButtonElement', 'HTMLElement'];
const originalTypes = new Map(elementTypes.map(name => [name, globalThis[name]]));
for (const name of elementTypes) globalThis[name] = class {};
const { HtmlSearchView } = await import('../Scripts/View/Search/HtmlSearchView.ts');
for (const [name, value] of originalTypes) {
    if (value === undefined) delete globalThis[name];
    else globalThis[name] = value;
}
import { Text } from '../Scripts/I18n/Text.ts';

/** 描画とタイマーを差し替え、検索待ちの表示遷移を確認する。 */
function setup() {
    const original = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
    const timers = new Map();
    let nextId = 0;
    globalThis.setTimeout = (callback, delay) => { const id = ++nextId; timers.set(id, { callback, delay }); return id; };
    globalThis.clearTimeout = id => timers.delete(id);
    const elements = Object.fromEntries(['retry', 'list', 'base-preview', 'pagination', 'status', 'previous', 'next', 'page'].map(id => [id, {
        textContent: 'previous', hidden: false, inert: false, children: ['previous'],
        setAttribute() {}, replaceChildren(...children) { this.children = children; },
    }]));
    const view = Object.create(HtmlSearchView.prototype);
    view.element = id => elements[id];
    view.candidatePopover = { hidePopover() {}, remove() {} };
    view.waveforms = { clear() {} };
    view.form = { disabled: false };
    view.lifecycle = { abort() {} };
    view.baseSuggestions = view.querySuggestions = { dispose() {} };
    return { view, elements, timers, restore: () => Object.assign(globalThis, original) };
}

test('短い再検索は前の内容と領域を残し、完了時だけ操作を戻す', () => {
    const h = setup();
    try {
        h.view.setStatus('searching');
        for (const id of ['list', 'base-preview', 'pagination']) {
            assert.deepEqual(h.elements[id].children, ['previous']);
            assert.equal(h.elements[id].hidden, false);
            assert.equal(h.elements[id].inert, true);
        }
        assert.equal(h.elements.status.textContent, 'previous');
        assert.equal([...h.timers.values()][0].delay, 200);
        h.view.setStatus('ready');
        assert.equal(h.timers.size, 0);
        assert.equal(h.elements.list.inert, true);
        h.view.showPage({ rows: [], baseline: null, total: 0, pageIndex: 0, pageCount: 0 });
        assert.equal(h.elements.list.inert, false);
        assert.deepEqual(h.elements.list.children, []);
        assert.equal(h.elements.status.textContent, Text.searchEmpty);
    } finally { h.restore(); }
});

test('長い検索だけ待機表示を出し、失敗・破棄時は通知予約と操作制限を解除する', () => {
    const h = setup();
    try {
        h.view.setStatus('searching');
        const [id, timer] = [...h.timers.entries()][0]; h.timers.delete(id); timer.callback();
        assert.equal(h.elements.status.textContent, Text.searchRunning);
        assert.deepEqual(h.elements.list.children, ['previous']);
        h.view.setStatus('searching');
        h.view.setStatus('failure');
        assert.equal(h.timers.size, 0);
        assert.equal(h.elements.list.inert, false);
        assert.equal(h.elements.retry.hidden, false);
        assert.equal(h.elements.status.textContent, Text.searchFailure);
        h.view.setStatus('searching'); h.view.dispose();
        assert.equal(h.timers.size, 0);
        assert.equal(h.elements.list.inert, false);
    } finally { h.restore(); }
});
