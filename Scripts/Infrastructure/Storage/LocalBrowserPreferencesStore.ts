import { localStorageStore } from '../../LocalStorage.ts';
import type { LocalStorage } from '../../LocalStorage.ts';
import { LocalStorageSchema } from '../../LocalStorageSchema.ts';
import { normalizePreferences } from '../../Model/Search/SearchPreferences.ts';
import type { SearchPreferencesValue } from '../../Model/Search/SearchPreferences.ts';
import type { BrowserPreferencesStore } from '../../Contracts/Services/BrowserPreferencesStore.ts';

/** 検索画面の保存設定を読み書きする。既存の既定値復元と警告による失敗処理を維持する。 */
export class LocalBrowserPreferencesStore implements BrowserPreferencesStore {
    private readonly storage: LocalStorage;
    constructor(storage = localStorageStore) { this.storage = storage; }
    /** 読み込めない場合でも検索を使えるよう、既定値を返す。 */
    read(): SearchPreferencesValue {
        try { return this.storage.readEntry(LocalStorageSchema.SearchPreferences); }
        catch (error) { console.warn('Cannot read search preferences', error); return normalizePreferences(); }
    }
    /** 最新の保存値に差分をマージし、他画面の設定を保持する。保存失敗は操作を中断しない。 */
    update(changes: Partial<SearchPreferencesValue>): void {
        try { this.storage.writeEntry(LocalStorageSchema.SearchPreferences, { ...this.read(), ...changes }); }
        catch (error) { console.warn('Cannot save search preferences', error); }
    }
}
