import { localStorageStore } from './LocalStorage.ts';
import type { LocalStorage } from './LocalStorage.ts';
import { LocalStorageSchema } from './LocalStorageSchema.ts';
import type { FavoriteSoundsStore } from '../../Contracts/Services/FavoriteSoundsStore.ts';

/** 既存のキー・配列形式を維持してお気に入りを永続化する。 */
export class LocalFavoriteSoundsStore implements FavoriteSoundsStore {
    private readonly storage: LocalStorage;
    constructor(storage = localStorageStore) { this.storage = storage; }
    read(): string[] { return this.storage.readEntry(LocalStorageSchema.Favorites); }
    save(names: string[]): void { this.storage.writeEntry(LocalStorageSchema.Favorites, names); }
}
