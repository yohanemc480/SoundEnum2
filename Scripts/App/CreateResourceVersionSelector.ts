import { ResourceVersionPresenter } from '../Presenter/ResourceVersionPresenter.ts';
import { HtmlResourceVersionView } from '../View/Settings/HtmlResourceVersionView.ts';
import { FetchResourceVersions } from '../Infrastructure/Resources/FetchResourceVersions.ts';
import { BrowserResourceVersionNavigation } from '../Infrastructure/Resources/BrowserResourceVersionNavigation.ts';
import type { BrowserPreferencesStore } from '../Contracts/Services/BrowserPreferencesStore.ts';

/** 選択欄の表示・通信・保存・遷移を接続する。 */
export function createResourceVersionSelector(preferences: BrowserPreferencesStore) {
    const view = new HtmlResourceVersionView();
    const presenter = new ResourceVersionPresenter(view, new FetchResourceVersions(), preferences, new BrowserResourceVersionNavigation());
    return { load: () => presenter.load(), dispose: () => { presenter.dispose(); view.dispose(); } };
}
