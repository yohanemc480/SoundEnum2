import { normalizeComposition, normalizeSavedCompositions } from './Model/Composition/CompositionData.ts';
export { normalizeComposition, normalizeSavedCompositions, normalizeCompositionName } from './Model/Composition/CompositionData.ts';
export type { CompositionValue, SavedComposition, SavedCompositionsValue } from './Model/Composition/CompositionData.ts';
import { normalizeCommandSettings } from './Model/Command/CommandSettings.ts';
import type { CommandSettingsValue } from './Model/Command/CommandSettings.ts';
export { normalizeCommandSettings };
export type { CommandSettingsValue };
import { LocalStorageKey } from './Constants/LocalStorageKey.ts';

export interface SearchPreferencesValue {
    version: string;
    query: string;
    base: string;
    tags: string[];
    excludeMultiple: boolean;
    tab: 'search-tab' | 'favorites-tab' | 'compositions-tab';
}

export type FavoriteSoundIds = string[];

/** 検証対象がオブジェクトか判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}
function isTab(value: unknown): value is SearchPreferencesValue['tab'] {
    return value === 'search-tab' || value === 'favorites-tab' || value === 'compositions-tab';
}


export function normalizePreferences(input: unknown = {}): SearchPreferencesValue {
    const value = isRecord(input) ? input : {};
    return {
        version: typeof value.version === 'string' ? value.version : '',
        query: typeof value.query === 'string' ? value.query : '',
        base: typeof value.base === 'string' ? value.base : '',
        tags: Array.isArray(value.tags) ? [...new Set(value.tags.filter(tag => typeof tag === 'string'))] : [],
        excludeMultiple: value.excludeMultiple === true,
        tab: isTab(value.tab) ? value.tab : 'search-tab',
    };
}

function normalizeFavorites(value: unknown): FavoriteSoundIds {
    if (!Array.isArray(value) || value.some(name => typeof name !== 'string')) throw new Error('Invalid favorites');
    return [...new Set(value.filter((name: unknown): name is string => typeof name === 'string'))];
}

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
        normalize: normalizeFavorites,
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
