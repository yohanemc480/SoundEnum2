import { CommandSettings, normalizeCommandSettings } from '../Model/Command/CommandSettings.ts';
import type { CommandSettingsStore } from '../Contracts/Services/CommandSettingsStore.ts';
import type { CommandSettingsView } from '../Contracts/Views/CommandSettingsView.ts';

/** 設定の入力を正規化し、保存できた値をModelと画面へ反映する。 */
export class CommandSettingsPresenter {
    private readonly model: CommandSettings;
    private readonly view: CommandSettingsView;
    private readonly store: CommandSettingsStore;
    private readonly failure: () => void;
    constructor(model: CommandSettings, view: CommandSettingsView, store: CommandSettingsStore, failure: () => void) {
        this.model = model; this.view = view; this.store = store; this.failure = failure;
        view.bind({ change: value => this.change(value), reset: () => this.change({}) });
        try { model.update(store.read()); } catch { failure(); }
        view.show(model.read());
    }
    /** 保存失敗時は現在値を維持する。既存画面が保存を拒否した場合も保存先の値を表示する。 */
    private change(value: unknown): void {
        try { this.store.save(normalizeCommandSettings(value)); this.model.update(this.store.read()); }
        catch { this.failure(); }
        this.view.show(this.model.read());
    }
}
