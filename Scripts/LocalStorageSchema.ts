import { normalizePreferences } from './Model/Search/SearchPreferences.ts';
export { normalizePreferences };
export type { SearchPreferencesValue } from './Model/Search/SearchPreferences.ts';
import { normalizeFavoriteSounds } from './Model/Favorites/FavoriteSounds.ts';
import { normalizeComposition, normalizeSavedCompositions } from './Model/Composition/CompositionData.ts';
export { normalizeComposition, normalizeSavedCompositions, normalizeCompositionName } from './Model/Composition/CompositionData.ts';
export type { CompositionValue, SavedComposition, SavedCompositionsValue } from './Model/Composition/CompositionData.ts';
import { normalizeCommandSettings } from './Model/Command/CommandSettings.ts';
import type { CommandSettingsValue } from './Model/Command/CommandSettings.ts';
export { normalizeCommandSettings };
export type { CommandSettingsValue };
import { LocalStorageKey } from './Constants/LocalStorageKey.ts';

export type FavoriteSoundIds = string[];

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
