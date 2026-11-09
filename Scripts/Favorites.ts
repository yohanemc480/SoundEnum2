import type { LocalStorage } from './LocalStorage.ts';
import { localStorageStore } from './LocalStorage.ts';
import { LocalStorageSchema } from './LocalStorageSchema.ts';

export class Favorites {
    private readonly storage: LocalStorage;
    names: Set<string>;
    constructor(storage = localStorageStore) {
        this.storage = storage;
        const saved = storage.readEntry(LocalStorageSchema.Favorites);
        this.names = new Set(saved);
    }
    toggle(name: string): void {
        const next = new Set(this.names);
        if (next.has(name)) next.delete(name); else next.add(name);
        this.storage.writeEntry(LocalStorageSchema.Favorites, [...next]);
        this.names = next;
    }
}
