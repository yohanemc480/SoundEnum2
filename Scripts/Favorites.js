import { localStorageStore } from './LocalStorage.js';
import { LocalStorageSchema } from './LocalStorageSchema.js';

export class Favorites {
    constructor(storage = localStorageStore) {
        this.storage = storage;
        const saved = storage.readEntry(LocalStorageSchema.Favorites);
        this.names = new Set(saved);
    }
    toggle(name) {
        const next = new Set(this.names);
        if (next.has(name)) next.delete(name); else next.add(name);
        this.storage.writeEntry(LocalStorageSchema.Favorites, [...next]);
        this.names = next;
    }
}
