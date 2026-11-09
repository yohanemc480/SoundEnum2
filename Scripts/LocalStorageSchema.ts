import { normalizeCommandSettings } from './Model/Command/CommandSettings.ts';
import type { CommandSettingsValue } from './Model/Command/CommandSettings.ts';
export { normalizeCommandSettings };
export type { CommandSettingsValue };
import { MCCommandSoundSource } from './Constants/MCCommandSoundSource.ts';
import { LocalStorageKey } from './Constants/LocalStorageKey.ts';
import type { SoundSource } from './Constants/MCCommandSoundSource.ts';
import type { SoundCommand } from './FormatSoundCommand.ts';

export interface SearchPreferencesValue {
    version: string;
    query: string;
    base: string;
    tags: string[];
    excludeMultiple: boolean;
    tab: 'search-tab' | 'favorites-tab' | 'compositions-tab';
}

export type CompositionValue = SoundCommand[];
export interface SavedComposition {
    id: string;
    name: string;
    version: string;
    sounds: CompositionValue;
}
export type SavedCompositionsValue = SavedComposition[];
export type FavoriteSoundIds = string[];

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}
function isSoundSource(value: unknown): value is SoundSource {
    return Object.values(MCCommandSoundSource).some(source => source === value);
}
function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
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

export function normalizeComposition(value: unknown): CompositionValue {
    if (!Array.isArray(value)) throw new Error('Invalid composition');
    return value.map((row: unknown) => {
        if (!isRecord(row) || typeof row.name !== 'string' || !row.name ||
            !isFiniteNumber(row.volume) || row.volume < 0 ||
            !isFiniteNumber(row.pitch) || row.pitch < .5 || row.pitch > 2) throw new Error('Invalid composition row');
        const source = row.source === undefined ? MCCommandSoundSource.Master : row.source;
        const minVolume = row.minVolume === undefined ? 0 : row.minVolume;
        if (!isSoundSource(source) ||
            !isFiniteNumber(minVolume) || minVolume < 0 || minVolume > 1) throw new Error('Invalid composition command settings');
        return { name: row.name, source, volume: row.volume, pitch: row.pitch, minVolume };
    });
}

export function normalizeCompositionName(value: unknown): string {
    if (typeof value !== 'string') throw new Error('Invalid composition name');
    const name = value.normalize('NFKC');
    if (!/^[A-Za-z0-9\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々・ _().-]+$/u.test(name) ||
        !name.trim() || name.trim().length > 20) throw new Error('Invalid composition name');
    return name.trim();
}

export function normalizeSavedCompositions(value: unknown): SavedCompositionsValue {
    if (!Array.isArray(value)) throw new Error('Invalid saved compositions');
    const ids = new Set<string>();
    return value.map((item: unknown) => {
        if (!isRecord(item) || typeof item.id !== 'string' || !item.id || ids.has(item.id) ||
            typeof item.name !== 'string' || !item.name.trim() || item.name.length > 20 ||
            !Array.isArray(item.sounds) || !item.sounds.length || item.sounds.length > 10) throw new Error('Invalid saved composition');
        if (item.version !== undefined && item.version !== '' &&
            (typeof item.version !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item.version))) throw new Error('Invalid saved version');
        ids.add(item.id);
        return { id: item.id, name: normalizeCompositionName(item.name), version: item.version ?? '', sounds: normalizeComposition(item.sounds) };
    });
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
