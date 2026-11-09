import { DisposalScope } from './DisposalScope.ts';
import { ResourceVersionPresenter } from '../Presenter/ResourceVersionPresenter.ts';
import { HtmlResourceVersionView } from '../View/Settings/HtmlResourceVersionView.ts';
import { FetchResourceVersions } from '../Infrastructure/Resources/FetchResourceVersions.ts';
import { BrowserResourceVersionNavigation } from '../Infrastructure/Resources/BrowserResourceVersionNavigation.ts';
import type { BrowserPreferencesStore } from '../Contracts/Services/BrowserPreferencesStore.ts';

/** 選択欄の表示・通信・保存・遷移を接続する。 */
export function createResourceVersionSelector(preferences: BrowserPreferencesStore) {
    const scope = new DisposalScope();
    try {
        const view = scope.own(new HtmlResourceVersionView());
        const presenter = scope.own(new ResourceVersionPresenter(view, new FetchResourceVersions(), preferences, new BrowserResourceVersionNavigation()));
        return { load: () => presenter.load(), dispose: () => scope.dispose() };
    } catch (error) {
        try { scope.dispose(); } catch (cleanupError) { console.error(cleanupError); }
        throw error;
    }
}
