import { toSearchOptions, toStoredSearchOptions } from '../../Model/Search/SearchPreferences.ts';
import type { SearchOptions } from '../../Model/Search/SearchTypes.ts';
import type { SearchPreferencesStore } from '../../Contracts/Services/SearchPreferencesStore.ts';
import type { BrowserPreferencesStore } from '../../Contracts/Services/BrowserPreferencesStore.ts';

/** 共有設定のうち検索条件だけをSearchPresenterへ公開する。 */
export class StoredSearchPreferences implements SearchPreferencesStore {
    private readonly preferences: BrowserPreferencesStore;
    constructor(preferences: BrowserPreferencesStore) { this.preferences = preferences; }
    read(): Required<SearchOptions> { return toSearchOptions(this.preferences.read()); }
    save(options: Required<SearchOptions>): void { this.preferences.update(toStoredSearchOptions(options)); }
}
