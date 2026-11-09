import { isBrowserTab } from '../../Model/Navigation/BrowserTab.ts';
import type { BrowserTab } from '../../Model/Navigation/BrowserTab.ts';
import type { BrowserTabsView } from '../../Contracts/Views/BrowserTabsView.ts';

/** タブと対応パネルを所有し、クリック・キーボード・アクセシビリティ表示を扱う。 */
export class HtmlBrowserTabsView implements BrowserTabsView {
    private readonly entries: { id: BrowserTab; tab: HTMLElement; panel: HTMLElement }[];
    private readonly lifecycle = new AbortController();
    private select?: (tab: BrowserTab) => void;
    constructor() {
        const tabs = [...document.querySelectorAll<HTMLElement>('[data-browser-tab]')];
        this.entries = tabs.map(tab => {
            if (!isBrowserTab(tab.id)) throw new Error(`Unknown browser tab: ${tab.id}`);
            const panelId = tab.getAttribute('aria-controls');
            const panel = panelId ? document.getElementById(panelId) : null;
            if (!panel) throw new Error(`Missing browser tab panel: ${panelId}`);
            return { id: tab.id, tab, panel };
        });
        if (this.entries.length !== 3 || new Set(this.entries.map(entry => entry.id)).size !== 3)
            throw new Error('Missing or duplicate browser tabs');
        this.entries.forEach(({ id, tab }, index) => {
            tab.addEventListener('click', () => this.select?.(id), { signal: this.lifecycle.signal });
            tab.addEventListener('keydown', event => this.moveFocus(event, index), { signal: this.lifecycle.signal });
        });
    }
    bind(select: (tab: BrowserTab) => void): () => void { this.select = select; return () => { this.select = undefined; }; }
    /** フォーカス自体を動かさず、選択表示とパネル・Tabキーの移動先を同期する。 */
    showSelected(id: BrowserTab): void {
        for (const { id: current, tab, panel } of this.entries) {
            const selected = current === id;
            tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; panel.hidden = !selected;
        }
    }
    /** 左右端では循環し、Home/Endでは先頭/末尾へ移動する。既存のクリック通知も発火させる。 */
    private moveFocus(event: KeyboardEvent, index: number): void {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const length = this.entries.length;
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? length - 1 : (index + (event.key === 'ArrowRight' ? 1 : length - 1)) % length;
        const tab = this.entries[next].tab; tab.focus(); tab.click();
    }
    /** 常設タブのクリックとキーボード購読を解除する。 */
    dispose(): void { this.lifecycle.abort(); this.select = undefined; }
}
