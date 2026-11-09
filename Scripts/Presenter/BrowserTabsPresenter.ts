import { isBrowserTab } from '../Model/Navigation/BrowserTab.ts';
import type { BrowserTab } from '../Model/Navigation/BrowserTab.ts';
import type { BrowserTabsView } from '../Contracts/Views/BrowserTabsView.ts';
import type { BrowserPreferencesStore } from '../Contracts/Services/BrowserPreferencesStore.ts';

/** 選択タブの復元と保存を調整する。DOM操作とキー入力はViewへ委譲する。 */
export class BrowserTabsPresenter {
    private readonly view: BrowserTabsView;
    private readonly preferences: BrowserPreferencesStore;
    private readonly unbind: () => void;
    private disposed = false;
    constructor(view: BrowserTabsView, preferences: BrowserPreferencesStore) {
        this.view = view; this.preferences = preferences;
        this.unbind = view.bind(tab => this.select(tab));
        const saved = preferences.read().tab;
        this.select(isBrowserTab(saved) ? saved : 'search-tab');
    }
    /** 保存するのはタブだけとし、他の検索条件とバージョンを維持する。 */
    private select(tab: BrowserTab): void {
        if (this.disposed || !isBrowserTab(tab)) return;
        this.preferences.update({ tab }); this.view.showSelected(tab);
    }
    /** 画面からの選択通知を解除する。 */
    dispose(): void { if (this.disposed) return; this.disposed = true; this.unbind(); }
}
