import { MCCommandSound } from './MCCommandSound.js';
import { MCCommandSoundSource } from './Constants/MCCommandSoundSource.js';
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

/**
 * @typedef {Object} CommandSettingsValue
 * @property {string} source playsoundのソース名
 * @property {number} volume 音量（0以上、1超も保存する）
 * @property {number} pitch ピッチ（0.5〜2）
 * @property {number} minVolume 最低音量（0〜1）
 */
/** @returns {CommandSettingsValue} */
export function normalizeCommandSettings(value = {}) {
    value = value && typeof value === 'object' ? value : {};
    const number = (input, fallback, min, max = Infinity) =>
        Number.isFinite(input) ? Math.min(max, Math.max(min, input)) : fallback;
    return {
        source: Object.values(MCCommandSoundSource).includes(value.source) ? value.source : MCCommandSoundSource.Master,
        volume: number(value.volume, MCCommandSound.DefaultVolume, MCCommandSound.MinVolume),
        pitch: number(value.pitch, MCCommandSound.DefaultPitch, MCCommandSound.MinPitch, MCCommandSound.MaxPitch),
        minVolume: number(value.minVolume, MCCommandSound.DefaultMinVolume, MCCommandSound.MinMinVolume, MCCommandSound.MaxMinVolume),
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
    CommandSettings: Object.freeze({
        key: LocalStorageKey.CommandSettings,
        createDefault: () => normalizeCommandSettings(),
        normalize: normalizeCommandSettings,
    }),
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
