import { MCCommandSound } from './MCCommandSound.js';
import { MCCommandSoundSource } from './Constants/MCCommandSoundSource.ts';
import { LocalStorageKey } from './Constants/LocalStorageKey.ts';

/** @typedef {string[]} FavoriteSoundIds サウンドIDのみ。バージョンやピッチは保存しない。 */

/**
 * @typedef {Object} SearchPreferencesValue
 * @property {string} version 選択中のバージョン（未選択は空文字）
 * @property {string} query サウンド名の検索文字列
 * @property {string} base 類似音の基準となるサウンドID
 * @property {string[]} tags AND検索するタグID
 * @property {boolean} excludeMultiple 複数候補のある音を除外するか
 * @property {'search-tab'|'favorites-tab'|'compositions-tab'} tab 開いているタブ
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
        tab: ['favorites-tab', 'compositions-tab'].includes(value.tab) ? value.tab : 'search-tab',
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

/** @typedef {{name: string, source: string, volume: number, pitch: number, minVolume: number}[]} CompositionValue 音ごとのコマンド設定。同じIDも複数保持する。 */
export function normalizeComposition(value) {
    if (!Array.isArray(value)) throw new Error('Invalid composition');
    return value.map(row => {
        if (!row || typeof row.name !== 'string' || !row.name ||
            !Number.isFinite(row.volume) || row.volume < 0 ||
            !Number.isFinite(row.pitch) || row.pitch < .5 || row.pitch > 2) throw new Error('Invalid composition row');
        const source = row.source === undefined ? MCCommandSoundSource.Master : row.source;
        const minVolume = row.minVolume === undefined ? MCCommandSound.DefaultMinVolume : row.minVolume;
        if (!Object.values(MCCommandSoundSource).includes(source) ||
            !Number.isFinite(minVolume) || minVolume < 0 || minVolume > 1) throw new Error('Invalid composition command settings');
        return { name: row.name, source, volume: row.volume, pitch: row.pitch, minVolume };
    });
}

export function normalizeCompositionName(value) {
    if (typeof value !== 'string') throw new Error('Invalid composition name');
    const name = value.normalize('NFKC');
    if (!/^[A-Za-z0-9\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々・ _().-]+$/u.test(name) ||
        !name.trim() || name.trim().length > 20) throw new Error('Invalid composition name');
    return name.trim();
}

/** @typedef {{id: string, name: string, version: string, sounds: CompositionValue}[]} SavedCompositionsValue */
export function normalizeSavedCompositions(value) {
    if (!Array.isArray(value)) throw new Error('Invalid saved compositions');
    const ids = new Set();
    return value.map(item => {
        if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) ||
            typeof item.name !== 'string' || !item.name.trim() || item.name.length > 20 ||
            !Array.isArray(item.sounds) || !item.sounds.length || item.sounds.length > 10) throw new Error('Invalid saved composition');
        if (item.version !== undefined && item.version !== '' &&
            (typeof item.version !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item.version))) throw new Error('Invalid saved version');
        ids.add(item.id);
        return { id: item.id, name: normalizeCompositionName(item.name), version: item.version ?? '', sounds: normalizeComposition(item.sounds) };
    });
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
    Composition: Object.freeze({
        key: LocalStorageKey.Composition,
        createDefault: () => [],
        normalize: normalizeComposition,
    }),
    Favorites: Object.freeze({
        key: LocalStorageKey.Favorites,
        createDefault: () => [],
        normalize: normalizeFavorites,
    }),
    SavedCompositions: Object.freeze({
        key: LocalStorageKey.SavedCompositions,
        createDefault: () => [],
        normalize: normalizeSavedCompositions,
    }),
    SearchPreferences: Object.freeze({
        key: LocalStorageKey.SearchPreferences,
        createDefault: () => normalizePreferences(),
        normalize: normalizePreferences,
    }),
});
