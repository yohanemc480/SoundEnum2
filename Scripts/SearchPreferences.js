const KEY = 'soundenum.search-preferences';

export function normalizePreferences(value = {}) {
    value = value && typeof value === 'object' ? value : {};
    return {
        version: typeof value.version === 'string' ? value.version : '',
        query: typeof value.query === 'string' ? value.query : '',
        base: typeof value.base === 'string' ? value.base : '',
        tags: Array.isArray(value.tags) ? [...new Set(value.tags.filter(tag => typeof tag === 'string'))] : [],
        excludeMultiple: value.excludeMultiple === true,
        tab: value.tab === 'favorites-tab' ? 'favorites-tab' : 'search-tab',
    };
}

export function readPreferences() {
    try { return normalizePreferences(JSON.parse(localStorage.getItem(KEY) ?? '{}')); }
    catch (error) { console.warn('Cannot read search preferences', error); return normalizePreferences(); }
}

export function savePreferences(changes) {
    try { localStorage.setItem(KEY, JSON.stringify(normalizePreferences({ ...readPreferences(), ...changes }))); }
    catch (error) { console.warn('Cannot save search preferences', error); }
}

export function restoreSearchPreferences(saved, index) {
    const state = normalizePreferences(saved);
    return { ...state,
        base: index.events.some(event => event.name === state.base) ? state.base : '',
        tags: state.tags.filter(id => index.tags.some(tag => tag.id === id)),
    };
}
