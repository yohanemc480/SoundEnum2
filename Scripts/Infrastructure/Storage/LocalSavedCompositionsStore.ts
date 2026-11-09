import { localStorageStore } from '../../LocalStorage.ts';
import { LocalStorageSchema } from '../../LocalStorageSchema.ts';
import type { SavedCompositionsValue } from '../../Model/Composition/CompositionData.ts';
import type { SavedCompositionsStore } from '../../Contracts/Services/SavedCompositionsStore.ts';

/** 既存のキーと検証を維持して保存一覧を読み書きする。 */
export class LocalSavedCompositionsStore implements SavedCompositionsStore {
    read(): SavedCompositionsValue { return localStorageStore.readEntry(LocalStorageSchema.SavedCompositions); }
    save(items: SavedCompositionsValue): void { localStorageStore.writeEntry(LocalStorageSchema.SavedCompositions, items); }
}
