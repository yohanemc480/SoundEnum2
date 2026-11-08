/** JSON保存の共通窓口。失敗は呼び出し元へ返し、機能ごとに通知・復旧する。 */
export class LocalStorage {
    constructor(storage) {
        this.storage = storage;
    }

    get backend() {
        return this.storage ?? globalThis.localStorage;
    }

    read(key, fallback = null) {
        const value = this.backend.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    }

    write(key, value) {
        this.backend.setItem(key, JSON.stringify(value));
    }

    readEntry(schema) {
        return schema.normalize(this.read(schema.key, schema.createDefault()));
    }

    writeEntry(schema, value) {
        this.write(schema.key, schema.normalize(value));
    }

    clear() {
        this.backend.clear();
    }
}

export const localStorageStore = new LocalStorage();
