import { isBrowserTab } from '../Navigation/BrowserTab.ts';
import type { BrowserTab } from '../Navigation/BrowserTab.ts';
import type { SearchOptions } from "./SearchTypes.ts";

/** 検索条件と選択中のバージョン・タブ。保存済みのフィールド名を維持する。 */
export interface SearchPreferencesValue {
    version: string;
    query: string;
    base: string;
    tags: string[];
    excludeMultiple: boolean;
    tab: BrowserTab;
}



/** 検証対象がオブジェクトか判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}
/** 不正なフィールドを既定値に戻し、配列は複製する。 */
export function normalizePreferences(input: unknown = {}): SearchPreferencesValue {
    const value = isRecord(input) ? input : {};
    return {
        version: typeof value.version === 'string' ? value.version : '',
        query: typeof value.query === 'string' ? value.query : '',
        base: typeof value.base === 'string' ? value.base : '',
        tags: Array.isArray(value.tags) ? [...new Set(value.tags.filter(tag => typeof tag === 'string'))] : [],
        excludeMultiple: value.excludeMultiple === true,
        tab: isBrowserTab(value.tab) ? value.tab : 'search-tab',
    };
}

/** 保存形式の名前を検索条件へ変換する。 */
export function toSearchOptions(saved: SearchPreferencesValue): Required<SearchOptions> {
    return { query: saved.query, tags: [...saved.tags], referenceSoundName: saved.base, excludeMultipleCandidates: saved.excludeMultiple };
}
/** 検索条件だけを保存用のフィールドへ変換する。 */
export function toStoredSearchOptions(options: Required<SearchOptions>): Partial<SearchPreferencesValue> {
    return { query: options.query, tags: [...options.tags], base: options.referenceSoundName, excludeMultiple: options.excludeMultipleCandidates };
}
/** 現在の索引で使えない基準サウンドとタグを除き、残りの条件を維持する。 */
export function restoreSearchOptions(saved: Required<SearchOptions>, index: { events: readonly { name: string }[]; tags: readonly { id: string }[] }): Required<SearchOptions> {
    return { ...saved, tags: saved.tags.filter(id => index.tags.some(tag => tag.id === id)),
        referenceSoundName: index.events.some(sound => sound.name === saved.referenceSoundName) ? saved.referenceSoundName : '' };
}
