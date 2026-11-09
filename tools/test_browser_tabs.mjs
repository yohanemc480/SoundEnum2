import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserTabsPresenter } from '../Scripts/Presenter/BrowserTabsPresenter.ts';
import { HtmlBrowserTabsView } from '../Scripts/View/Layout/HtmlBrowserTabsView.ts';

/** 最低限のタブとパネルで、実際のViewとPresenterを接続する。 */
function fixture(t, selected = 'favorites-tab') {
    const oldDocument = globalThis.document;
    class Tab extends EventTarget {
        constructor(id) { super(); this.id = id; this.attributes = { 'aria-controls': id + '-panel' }; }
        getAttribute(key) { return this.attributes[key]; }
        setAttribute(key, value) { this.attributes[key] = value; }
        click() { this.dispatchEvent(new Event('click')); }
        focus() { globalThis.document.activeElement = this; }
    }
    const tabs = ['search-tab', 'favorites-tab', 'compositions-tab'].map(id => new Tab(id));
    const panels = Object.fromEntries(tabs.map(tab => [tab.id + '-panel', { hidden: false }]));
    globalThis.document = { querySelectorAll: () => tabs, getElementById: id => panels[id], activeElement: null };
    const state = { query: 'bell', version: '26.3', tab: selected }; let writes = 0;
    const view = new HtmlBrowserTabsView();
    const presenter = new BrowserTabsPresenter(view, { read: () => ({ ...state }), update: value => { Object.assign(state, value); writes++; } });
    t.after(() => { presenter.dispose(); view.dispose(); if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument; });
    return { tabs, panels, state, view, presenter, writes: () => writes };
}
/** キー名付きのイベントを送り、標準動作の抑止も検証できるようにする。 */
function press(tab, key) {
    const event = new Event('keydown', { cancelable: true }); Object.defineProperty(event, 'key', { value: key });
    tab.dispatchEvent(event); return event;
}

test('tabs restore selection and change only the tab preference with accessible panel state', t => {
    const f = fixture(t);
    assert.equal(f.tabs[1].getAttribute('aria-selected'), 'true'); assert.equal(f.panels['favorites-tab-panel'].hidden, false);
    assert.equal(globalThis.document.activeElement, null);
    f.tabs[2].click();
    assert.deepEqual(f.state, { query: 'bell', version: '26.3', tab: 'compositions-tab' });
    assert.deepEqual(f.tabs.map(tab => tab.tabIndex), [-1, -1, 0]);
    assert.deepEqual(Object.values(f.panels).map(panel => panel.hidden), [true, true, false]);
});

test('arrow keys wrap and Home/End move focus while notifying existing click subscribers', t => {
    const f = fixture(t, 'search-tab'); let activations = 0;
    f.tabs.forEach(tab => tab.addEventListener('click', () => activations++));
    assert.equal(press(f.tabs[0], 'ArrowLeft').defaultPrevented, true); assert.equal(f.state.tab, 'compositions-tab');
    assert.equal(globalThis.document.activeElement, f.tabs[2]);
    press(f.tabs[2], 'ArrowRight'); assert.equal(f.state.tab, 'search-tab');
    press(f.tabs[0], 'End'); assert.equal(f.state.tab, 'compositions-tab');
    press(f.tabs[2], 'Home'); assert.equal(f.state.tab, 'search-tab'); assert.equal(activations, 4);
    assert.equal(press(f.tabs[0], 'Escape').defaultPrevented, false); assert.equal(activations, 4);
});

test('unknown saved tabs fall back to search and disposed views no longer move focus or write', t => {
    const f = fixture(t, 'unknown'); assert.equal(f.state.tab, 'search-tab');
    const writes = f.writes(); f.presenter.dispose(); f.view.dispose();
    f.tabs[1].click(); const event = press(f.tabs[0], 'End');
    assert.equal(f.writes(), writes); assert.equal(event.defaultPrevented, false); assert.equal(globalThis.document.activeElement, null);
});
