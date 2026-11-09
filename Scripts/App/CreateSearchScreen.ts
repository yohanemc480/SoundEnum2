import { HtmlSearchView } from '../View/Search/HtmlSearchView.ts';
import { SearchPresenter } from '../Presenter/SearchPresenter.ts';
import { WorkerSearchService } from '../Infrastructure/Search/WorkerSearchService.ts';
import { readPreferences, saveSearchOptions, toSearchOptions } from '../SearchPreferences.ts';
import { LocalFavoriteSoundsStore } from '../Infrastructure/Storage/LocalFavoriteSoundsStore.ts';
import { confirmAction } from '../ConfirmDialog.ts';
import { showToast } from '../Toast.ts';
import { Text } from '../Text.ts';
import type { ResourcePathProvider } from '../ResourcePathProvider.ts';
import type { CompositionActions } from '../Contracts/Services/CompositionActions.ts';
import type { SoundPreviewService } from '../Contracts/Services/SoundPreviewService.ts';

/** 検索のMVPを生成する。再生サービスはAppから注入し、検索側では実装を知らない。 */
export function createSearchScreen(paths: ResourcePathProvider, composition: CompositionActions, preview: SoundPreviewService) {
    const view = new HtmlSearchView();
    const presenter = new SearchPresenter(view, new WorkerSearchService(paths), {
        read: () => toSearchOptions(readPreferences()), save: saveSearchOptions,
    }, composition, preview, new LocalFavoriteSoundsStore(), {
        schedule: (callback, milliseconds) => {
            const timer = setTimeout(callback, milliseconds);
            return () => clearTimeout(timer);
        },
        confirmFavoriteRemoval: name => confirmAction(Text.favoritesRemoveConfirm(name), { acceptLabel: Text.confirmRemove }),
        notifyFailure: operation => showToast(operation === 'favorites' ? Text.favoritesFailure : Text.searchFailure),
    });
    return { presenter, view, dispose: () => { presenter.dispose(); view.dispose(); } };
}
