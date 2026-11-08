import { localStorageStore } from './LocalStorage.js';
import { LocalStorageSchema, normalizePreferences } from './LocalStorageSchema.js';

export function readPreferences() {
    try { return localStorageStore.readEntry(LocalStorageSchema.SearchPreferences); }
    catch (error) { console.warn('Cannot read search preferences', error); return normalizePreferences(); }
}

export function savePreferences(changes) {
    try { localStorageStore.writeEntry(LocalStorageSchema.SearchPreferences, { ...readPreferences(), ...changes }); }
    catch (error) { console.warn('Cannot save search preferences', error); }
}

export function restoreSearchPreferences(saved, index) {
    const state = normalizePreferences(saved);
    return { ...state,
        base: index.events.some(event => event.name === state.base) ? state.base : '',
        tags: state.tags.filter(id => index.tags.some(tag => tag.id === id)),
    };
}
