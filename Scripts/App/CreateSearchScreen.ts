import { DisposalScope } from './DisposalScope.ts';
import { HtmlSearchView } from '../View/Search/HtmlSearchView.ts';
import { SearchPresenter } from '../Presenter/SearchPresenter.ts';
import { WorkerSearchService } from '../Infrastructure/Search/WorkerSearchService.ts';
import { StoredSearchPreferences } from '../Infrastructure/Storage/StoredSearchPreferences.ts';
import type { BrowserPreferencesStore } from '../Contracts/Services/BrowserPreferencesStore.ts';
import { LocalFavoriteSoundsStore } from '../Infrastructure/Storage/LocalFavoriteSoundsStore.ts';
import { confirmAction } from '../View/Components/ConfirmDialog/ConfirmDialog.ts';
import { showToast } from '../View/Components/Toast/Toast.ts';
import { Text } from '../I18n/Text.ts';
import type { ResourcePathProvider } from '../Infrastructure/Resources/ResourcePathProvider.ts';
import type { CompositionActions } from '../Contracts/Services/CompositionActions.ts';
import type { SoundPreviewService } from '../Contracts/Services/SoundPreviewService.ts';

/** 検索のMVPを生成する。再生サービスはAppから注入し、検索側では実装を知らない。 */
export function createSearchScreen(paths: ResourcePathProvider, composition: CompositionActions, preview: SoundPreviewService, preferences: BrowserPreferencesStore) {
    const scope = new DisposalScope();
    try {
        const view = scope.own(new HtmlSearchView());
        const searchService = scope.own(new WorkerSearchService(paths));
        const presenter = scope.own(new SearchPresenter(view, searchService, new StoredSearchPreferences(preferences), composition, preview, new LocalFavoriteSoundsStore(), {
            schedule: (callback, milliseconds) => {
                const timer = setTimeout(callback, milliseconds);
                return () => clearTimeout(timer);
            },
            confirmFavoriteRemoval: name => confirmAction(Text.favoritesRemoveConfirm(name), { acceptLabel: Text.confirmRemove }),
            notifyFailure: operation => showToast(operation === 'favorites' ? Text.favoritesFailure : Text.searchFailure),
        }));
        return { presenter, view, dispose: () => scope.dispose() };
    } catch (error) {
        try { scope.dispose(); } catch (cleanupError) { console.error(cleanupError); }
        throw error;
    }
}
