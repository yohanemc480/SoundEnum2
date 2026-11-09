import type { SearchPreferencesValue } from '../../Model/Search/SearchPreferences.ts';

/** 検索条件・バージョン・タブを共有し、指定フィールドだけ更新する。 */
export interface BrowserPreferencesStore {
    read(): SearchPreferencesValue;
    update(changes: Partial<SearchPreferencesValue>): void;
}
