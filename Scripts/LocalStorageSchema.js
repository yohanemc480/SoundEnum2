import { LocalStorageKey } from './Constants/LocalStorageKey.js';

/** @typedef {string[]} FavoriteSoundIds サウンドIDのみ。バージョンやピッチは保存しない。 */

/**
 * @typedef {Object} SearchPreferencesValue
 * @property {string} version 選択中のバージョン（未選択は空文字）
 * @property {string} query サウンド名の検索文字列
 * @property {string} base 類似音の基準となるサウンドID
 * @property {string[]} tags AND検索するタグID
 * @property {boolean} excludeMultiple 複数候補のある音を除外するか
 * @property {'search-tab'|'favorites-tab'} tab 開いているタブ
 */

/** @returns {SearchPreferencesValue} */
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

/** @returns {FavoriteSoundIds} */
function normalizeFavorites(value) {
    if (!Array.isArray(value) || value.some(name => typeof name !== 'string')) throw new Error('Invalid favorites');
    return [...new Set(value)];
}

/**
 * 保存キー・初期値・値の検証/補正をまとめた保存形式の定義。
 * normalizeは読み書きの両方で使用する。既存キーとJSON構造は維持する。
 */
export const LocalStorageSchema = Object.freeze({
    Favorites: Object.freeze({
        key: LocalStorageKey.Favorites,
        createDefault: () => [],
        normalize: normalizeFavorites,
    }),
    SearchPreferences: Object.freeze({
        key: LocalStorageKey.SearchPreferences,
        createDefault: () => normalizePreferences(),
        normalize: normalizePreferences,
    }),
});
