import type { CommandSettingsStore } from '../../Contracts/Services/CommandSettingsStore.ts';
import type { CommandSettingsValue } from '../../Model/Command/CommandSettings.ts';
import { localStorageStore } from '../../LocalStorage.ts';
import { LocalStorageSchema } from '../../LocalStorageSchema.ts';

/** 既存の保存キー・JSON形式を維持する設定ストア。失敗は呼び出し元へ返す。 */
export class LocalCommandSettingsStore implements CommandSettingsStore {
    read(): CommandSettingsValue { return localStorageStore.readEntry(LocalStorageSchema.CommandSettings); }
    save(value: CommandSettingsValue): void { localStorageStore.writeEntry(LocalStorageSchema.CommandSettings, value); }
}
