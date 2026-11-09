import { DisposalScope } from './DisposalScope.ts';
import { HtmlBrowserTabsView } from '../View/Layout/HtmlBrowserTabsView.ts';
import { BrowserTabsPresenter } from '../Presenter/BrowserTabsPresenter.ts';
import type { BrowserPreferencesStore } from '../Contracts/Services/BrowserPreferencesStore.ts';

/** タブの表示と、Appで共有する保存先を接続する。 */
export function createBrowserTabs(preferences: BrowserPreferencesStore) {
    const scope = new DisposalScope();
    try {
        const view = scope.own(new HtmlBrowserTabsView());
        const presenter = scope.own(new BrowserTabsPresenter(view, preferences));
        return { dispose: () => scope.dispose() };
    } catch (error) {
        try { scope.dispose(); } catch (cleanupError) { console.error(cleanupError); }
        throw error;
    }
}
