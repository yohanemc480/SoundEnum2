import type { SearchPreferencesValue } from './LocalStorageSchema.ts';
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

export function restoreSearchPreferences(saved: unknown, index: { events: readonly { name: string }[]; tags: readonly { id: string }[] }): SearchPreferencesValue {
    const state = normalizePreferences(saved);
    return { ...state,
        base: index.events.some(event => event.name === state.base) ? state.base : '',
        tags: state.tags.filter(id => index.tags.some(tag => tag.id === id)),
    };
}
