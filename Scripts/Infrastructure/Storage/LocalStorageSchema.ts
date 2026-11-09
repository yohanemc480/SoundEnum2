import { normalizePreferences } from '../../Model/Search/SearchPreferences.ts';
import { normalizeFavoriteSounds } from '../../Model/Favorites/FavoriteSounds.ts';
import { normalizeComposition, normalizeSavedCompositions } from '../../Model/Composition/CompositionData.ts';
import { normalizeCommandSettings } from '../../Model/Command/CommandSettings.ts';
import { LocalStorageKey } from './LocalStorageKey.ts';


/** 保存キーと既存データの正規化規則を対応付ける。 */
export const LocalStorageSchema = Object.freeze({
    CommandSettings: Object.freeze({
        key: LocalStorageKey.CommandSettings,
        createDefault: () => normalizeCommandSettings(),
        normalize: normalizeCommandSettings,
    }),
    Composition: Object.freeze({
        key: LocalStorageKey.Composition,
        createDefault: () => [],
        normalize: normalizeComposition,
    }),
    Favorites: Object.freeze({
        key: LocalStorageKey.Favorites,
        createDefault: () => [],
        normalize: normalizeFavoriteSounds,
    }),
    SavedCompositions: Object.freeze({
        key: LocalStorageKey.SavedCompositions,
        createDefault: () => [],
        normalize: normalizeSavedCompositions,
    }),
    SearchPreferences: Object.freeze({
        key: LocalStorageKey.SearchPreferences,
        createDefault: () => normalizePreferences(),
        normalize: normalizePreferences,
    }),
});
