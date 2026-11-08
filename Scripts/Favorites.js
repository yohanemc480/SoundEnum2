const KEY = 'soundenum.favorites';

export class Favorites {
    constructor(storage = globalThis.localStorage) {
        this.storage = storage;
        const saved = JSON.parse(storage.getItem(KEY) ?? '[]');
        if (!Array.isArray(saved) || saved.some(name => typeof name !== 'string')) throw new Error('Invalid favorites');
        this.names = new Set(saved);
    }
    toggle(name) {
        const next = new Set(this.names);
        if (next.has(name)) next.delete(name); else next.add(name);
        this.storage.setItem(KEY, JSON.stringify([...next]));
        this.names = next;
    }
}
