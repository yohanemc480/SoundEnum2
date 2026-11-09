import { MCCommandSoundSource } from '../../Constants/MCCommandSoundSource.ts';
import type { SoundSource } from '../../Constants/MCCommandSoundSource.ts';
import type { SoundCommand } from '../../FormatSoundCommand.ts';

/** 組み合わせの各行。重複するサウンドも順番どおり保持する。 */
export type CompositionValue = SoundCommand[];
/** 名前と対象バージョンを付けて保存した組み合わせ。 */
export interface SavedComposition {
    id: string;
    name: string;
    version: string;
    sounds: CompositionValue;
}
/** 保存済みの組み合わせの一覧。 */
export type SavedCompositionsValue = SavedComposition[];

/** 検証対象がプロパティを持つオブジェクトか判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}
/** Minecraftが受け付ける音源カテゴリか判定する。 */
function isSoundSource(value: unknown): value is SoundSource {
    return Object.values(MCCommandSoundSource).some(source => source === value);
}
/** NaNや無限大を含まない数値か判定する。 */
function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/** 行の値を検証して独立したコピーを返す。旧形式の省略項目は既定値で補う。 */
export function normalizeComposition(value: unknown): CompositionValue {
    if (!Array.isArray(value)) throw new Error('Invalid composition');
    return value.map((row: unknown) => {
        if (!isRecord(row) || typeof row.name !== 'string' || !row.name ||
            !isFiniteNumber(row.volume) || row.volume < 0 ||
            !isFiniteNumber(row.pitch) || row.pitch < .5 || row.pitch > 2) throw new Error('Invalid composition row');
        const source = row.source === undefined ? MCCommandSoundSource.Master : row.source;
        const minVolume = row.minVolume === undefined ? 0 : row.minVolume;
        if (!isSoundSource(source) ||
            !isFiniteNumber(minVolume) || minVolume < 0 || minVolume > 1) throw new Error('Invalid composition command settings');
        return { name: row.name, source, volume: row.volume, pitch: row.pitch, minVolume };
    });
}

/** 表示名を正規化し、使用文字と長さを検証する。 */
export function normalizeCompositionName(value: unknown): string {
    if (typeof value !== 'string') throw new Error('Invalid composition name');
    const name = value.normalize('NFKC');
    if (!/^[A-Za-z0-9\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々・ _().-]+$/u.test(name) ||
        !name.trim() || name.trim().length > 20) throw new Error('Invalid composition name');
    return name.trim();
}

/** 保存一覧を検証する。不正な行やID重複を黙って削除しない。 */
export function normalizeSavedCompositions(value: unknown): SavedCompositionsValue {
    if (!Array.isArray(value)) throw new Error('Invalid saved compositions');
    const ids = new Set<string>();
    return value.map((item: unknown) => {
        if (!isRecord(item) || typeof item.id !== 'string' || !item.id || ids.has(item.id) ||
            typeof item.name !== 'string' || !item.name.trim() || item.name.length > 20 ||
            !Array.isArray(item.sounds) || !item.sounds.length || item.sounds.length > 10) throw new Error('Invalid saved composition');
        if (item.version !== undefined && item.version !== '' &&
            (typeof item.version !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item.version))) throw new Error('Invalid saved version');
        ids.add(item.id);
        return { id: item.id, name: normalizeCompositionName(item.name), version: item.version ?? '', sounds: normalizeComposition(item.sounds) };
    });
}

