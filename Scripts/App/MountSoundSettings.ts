import { CommandSettings } from '../Model/Command/CommandSettings.ts';
import type { CommandSettingsValue } from '../Model/Command/CommandSettings.ts';
import { CommandSettingsPresenter } from '../Presenter/CommandSettingsPresenter.ts';
import { createCommandSettingsView } from '../View/Settings/CommandSettingsView.ts';

/** 既存画面から設定の保存先を受け取る接続情報。 */
interface SoundSettingsOptions {
    read: () => CommandSettingsValue;
    save: (value: CommandSettingsValue) => void;
    onInput?: () => void;
    model?: CommandSettings;
}
/** 既存の設定パネルにModel・Presenter・Viewを接続する移行用の入口。 */
export function mountSoundSettings(panel: HTMLElement | null, options: SoundSettingsOptions): void {
    new CommandSettingsPresenter(options.model ?? new CommandSettings(), createCommandSettingsView(panel, options.onInput),
        { read: options.read, save: options.save }, () => console.warn('Cannot save or load command settings'));
}
