import type { CommandSettingsValue } from '../../Model/Command/CommandSettings.ts';
/** 既存の保存形式を隠してコマンド設定を読み書きする。 */
export interface CommandSettingsStore {
    read(): CommandSettingsValue;
    save(value: CommandSettingsValue): void;
}
