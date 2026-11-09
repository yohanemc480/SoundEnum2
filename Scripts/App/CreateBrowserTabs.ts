import { HtmlBrowserTabsView } from '../View/Layout/HtmlBrowserTabsView.ts';
import { BrowserTabsPresenter } from '../Presenter/BrowserTabsPresenter.ts';
import type { BrowserPreferencesStore } from '../Contracts/Services/BrowserPreferencesStore.ts';

/** タブの表示と、Appで共有する保存先を接続する。 */
export function createBrowserTabs(preferences: BrowserPreferencesStore) {
    const view = new HtmlBrowserTabsView();
    const presenter = new BrowserTabsPresenter(view, preferences);
    return { dispose: () => { presenter.dispose(); view.dispose(); } };
}
