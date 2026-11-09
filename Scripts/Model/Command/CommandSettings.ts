import { MCCommandSoundSource } from '../../Constants/MCCommandSoundSource.ts';
import type { SoundCommand } from '../../FormatSoundCommand.ts';

/** playsoundの設定値。サウンド名や保存形式を含まない。 */
export type CommandSettingsValue = Omit<SoundCommand, 'name'>;

/** 不正値を既定値へ戻し、Minecraftの設定範囲内へ正規化する。 */
export function normalizeCommandSettings(input: unknown = {}): CommandSettingsValue {
    const value = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
    /** 有限の数値だけを受け取り、許容範囲に収める。 */
    const number = (input: unknown, fallback: number, min: number, max = Infinity) =>
        typeof input === 'number' && Number.isFinite(input) ? Math.min(max, Math.max(min, input)) : fallback;
    return {
        source: Object.values(MCCommandSoundSource).find(source => source === value.source) ?? MCCommandSoundSource.Master,
        volume: number(value.volume, 1, 0), pitch: number(value.pitch, 1, .5, 2),
        minVolume: number(value.minVolume, 0, 0, 1),
    };
}

/** 現在のコマンド設定の正本。保存やDOMには依存せず、外部にはコピーを渡す。 */
export class CommandSettings {
    private value: CommandSettingsValue;
    constructor(initial: unknown = {}) { this.value = normalizeCommandSettings(initial); }
    /** 現在値のコピーを返し、外部からの書き換えを防ぐ。 */
    read(): CommandSettingsValue { return { ...this.value }; }
    /** 入力を正規化して置き換える。 */
    update(value: unknown): void { this.value = normalizeCommandSettings(value); }
}
