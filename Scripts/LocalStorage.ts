export interface StorageBackend {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    clear(): void;
}

export interface StorageEntry<T> {
    readonly key: string;
    createDefault(): T;
    normalize(value: unknown): T;
}

/** JSON保存の共通窓口。失敗は呼び出し元へ返し、機能ごとに通知・復旧する。 */
export class LocalStorage {
    private readonly storage: StorageBackend | undefined;

    constructor(storage?: StorageBackend) {
        this.storage = storage;
    }

    get backend(): StorageBackend {
        return this.storage ?? globalThis.localStorage;
    }

    read(key: string, fallback: unknown = null): unknown {
        const value = this.backend.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    }

    write(key: string, value: unknown): void {
        this.backend.setItem(key, JSON.stringify(value));
    }

    readEntry<T>(schema: StorageEntry<T>): T {
        return schema.normalize(this.read(schema.key, schema.createDefault()));
    }

    writeEntry<T>(schema: StorageEntry<T>, value: unknown): void {
        this.write(schema.key, schema.normalize(value));
    }

    clear(): void {
        this.backend.clear();
    }
}

export const localStorageStore = new LocalStorage();
