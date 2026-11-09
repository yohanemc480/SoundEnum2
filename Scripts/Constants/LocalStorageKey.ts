/** 保存済みデータとの互換性のため、キーの値は変更しない。 */
export const LocalStorageKey = Object.freeze({
    CommandSettings: 'soundenum.command-settings',
    Composition: 'soundenum.composition',
    Favorites: 'soundenum.favorites',
    SavedCompositions: 'soundenum.saved-compositions',
    SearchPreferences: 'soundenum.search-preferences',
} as const);
