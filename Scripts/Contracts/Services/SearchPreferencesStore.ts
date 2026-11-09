import type { SearchOptions } from '../../Model/Search/SearchTypes.ts';

/** 検索条件の保存境界。実装側は検索以外の保存項目（バージョン・選択タブ）を保持する。 */
export interface SearchPreferencesStore {
    read(): Required<SearchOptions>;
    save(options: Required<SearchOptions>): void;
}

