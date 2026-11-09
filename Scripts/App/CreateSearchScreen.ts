import { HtmlSearchView } from '../View/Search/HtmlSearchView.ts';
import { SearchPresenter } from '../Presenter/SearchPresenter.ts';
import { WorkerSearchService } from '../Infrastructure/Search/WorkerSearchService.ts';
import { readPreferences, saveSearchOptions, toSearchOptions } from '../SearchPreferences.ts';
import { Favorites } from '../Favorites.ts';
import { SoundManager } from '../Singletons/SoundManager.ts';
import { MCCommandSound } from '../MCCommandSound.ts';
import { MCCommandSelector } from '../Constants/MCCommandSelector.ts';
import { MCRawSound } from '../MCRawSound.ts';
import { confirmAction } from '../ConfirmDialog.ts';
import { showToast } from '../Toast.ts';
import { Text } from '../Text.ts';
import type { ResourcePathProvider } from '../ResourcePathProvider.ts';
import type { SoundComposition } from '../SoundComposition.ts';
import type { OutputArea } from '../OutputArea.ts';

/** 検索のMVPを生成する。再生・保存は後続の移行まで既存実装へのアダプターで接続する。 */
export function createSearchScreen(paths: ResourcePathProvider, composition: SoundComposition, output: OutputArea) {
    const view = new HtmlSearchView();
    let favorites: Favorites | null;
    try { favorites = new Favorites(); }
    catch (error) { console.error(error); favorites = null; }
    const presenter = new SearchPresenter(view, new WorkerSearchService(paths), {
        read: () => toSearchOptions(readPreferences()), save: saveSearchOptions,
    }, composition, {
        play: async ({ name, candidate, settings }) => {
            const manager = SoundManager.Instance;
            const command = new MCCommandSound(name, settings?.source ?? manager.GetSource(), MCCommandSelector.All,
                settings?.volume ?? manager.GetVolume(), settings?.pitch ?? manager.GetPitch(), settings?.minVolume ?? manager.GetMinVolume());
            const playing = manager.Play(command, candidate ? new MCRawSound({ ...candidate }) : null);
            output.SetText(command.ToString());
            await playing;
        },
    }, favorites, {
        schedule: (callback, milliseconds) => {
            const timer = setTimeout(callback, milliseconds);
            return () => clearTimeout(timer);
        },
        confirmFavoriteRemoval: name => confirmAction(Text.favoritesRemoveConfirm(name), { acceptLabel: Text.confirmRemove }),
        notifyFailure: operation => showToast(operation === 'favorites' ? Text.favoritesFailure : Text.searchFailure),
    });
    return { presenter, view, dispose: () => { presenter.dispose(); view.dispose(); } };
}
