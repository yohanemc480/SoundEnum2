import type { CommandSettingsValue } from '../../Model/Command/CommandSettings.ts';
/** 設定入力とリセットを値で通知する。 */
export interface CommandSettingsActions {
    change(value: unknown): void;
    reset(): void;
}
/** 設定の表示と入力イベントを接続する。正規化と保存はPresenterが担当する。 */
export interface CommandSettingsView {
    bind(actions: CommandSettingsActions): void;
    show(value: CommandSettingsValue): void;
}
