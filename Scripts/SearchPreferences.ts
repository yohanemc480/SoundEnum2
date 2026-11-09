import type { SearchPreferencesValue } from './LocalStorageSchema.ts';
import type { SearchOptions } from './Model/Search/SearchTypes.ts';
import { localStorageStore } from './LocalStorage.ts';
import { LocalStorageSchema, normalizePreferences } from './LocalStorageSchema.ts';

export function readPreferences(): SearchPreferencesValue {
    try { return localStorageStore.readEntry(LocalStorageSchema.SearchPreferences); }
    catch (error) { console.warn('Cannot read search preferences', error); return normalizePreferences(); }
}

export function savePreferences(changes: Partial<SearchPreferencesValue>): void {
    try { localStorageStore.writeEntry(LocalStorageSchema.SearchPreferences, { ...readPreferences(), ...changes }); }
    catch (error) { console.warn('Cannot save search preferences', error); }
}

/** 保存済みの旧フィールド名を、検索処理が使う条件名に変換する。 */
export function toSearchOptions(saved: SearchPreferencesValue): Required<SearchOptions> {
    return { query: saved.query, tags: saved.tags, referenceSoundName: saved.base,
        excludeMultipleCandidates: saved.excludeMultiple };
}

/** 保存形式を維持して検索条件だけを更新し、バージョンと選択タブを保持する。 */
export function saveSearchOptions(options: Required<SearchOptions>): void {
    savePreferences({ query: options.query, tags: options.tags, base: options.referenceSoundName,
        excludeMultiple: options.excludeMultipleCandidates });
}

export function restoreSearchPreferences(saved: unknown, index: { events: readonly { name: string }[]; tags: readonly { id: string }[] }): SearchPreferencesValue {
    const state = normalizePreferences(saved);
    return { ...state,
        base: index.events.some(event => event.name === state.base) ? state.base : '',
        tags: state.tags.filter(id => index.tags.some(tag => tag.id === id)),
    };
}
