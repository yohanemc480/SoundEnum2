/** 取得中の共有通信と、取得済みの変更されないバイト列を保持する。 */
interface CachedResource {
    controller: AbortController;
    promise: Promise<ArrayBuffer>;
    users: number;
    ready: boolean;
    bytes: number;
}

/** URL単位で取得を共有する容量制限付きキャッシュ。中断は利用者単位で管理する。 */
export class ResourceCache {
    private readonly entries = new Map<string, CachedResource>();
    private bytes = 0;
    private readonly maxBytes: number;
    private readonly maxEntries: number;
    constructor(maxBytes: number, maxEntries = 256) {
        this.maxBytes = maxBytes;
        this.maxEntries = maxEntries;
    }

    /** 相対・絶対URLを同一視する。ブラウザ外のテストでは渡されたパスを使う。 */
    private key(path: string): string {
        return typeof location === 'undefined' ? path : new URL(path, location.href).href;
    }

    /** 取得中も共有し、呼び出し元には転送・デコードで破壊してよいコピーを返す。 */
    load(path: string, signal?: AbortSignal): Promise<ArrayBuffer> {
        if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
        const key = this.key(path);
        let entry = this.entries.get(key);
        if (!entry) {
            const controller = new AbortController();
            entry = { controller, users: 0, ready: false, bytes: 0, promise: Promise.resolve(new ArrayBuffer(0)) };
            const created = entry;
            this.entries.set(key, created);
            created.promise = fetch(path, { signal: controller.signal, cache: 'no-cache' }).then(async response => {
                if (!response.ok) throw new Error(response.status === 404 ? 'missing (HTTP 404)' : `HTTP ${response.status}`);
                return response.arrayBuffer();
            }).then(buffer => {
                if (this.entries.get(key) === created) {
                    created.ready = true; created.bytes = buffer.byteLength; this.bytes += created.bytes;
                    this.trim();
                }
                return buffer;
            }).catch(error => {
                if (this.entries.get(key) === created) this.remove(key);
                throw error;
            });
        } else {
            this.entries.delete(key); this.entries.set(key, entry);
        }
        const shared = entry;
        shared.users++;
        return new Promise((resolve, reject) => {
            let finished = false;
            /** 利用終了時に購読を外し、最後の利用者の中断だけを共有通信へ伝える。 */
            const release = () => {
                if (finished) return false;
                finished = true; signal?.removeEventListener('abort', abort);
                shared.users--;
                if (!shared.ready && shared.users === 0 && this.entries.get(key) === shared) this.remove(key);
                return true;
            };
            /** この利用者の待機だけを中断する。 */
            const abort = () => { if (release()) reject(new DOMException('Aborted', 'AbortError')); };
            signal?.addEventListener('abort', abort, { once: true });
            shared.promise.then(buffer => { if (release()) resolve(buffer.slice(0)); },
                error => { if (release()) reject(error); });
        });
    }

    /** 取得済みの古い項目から追い出し、使用中の結果は各呼び出し元に任せる。 */
    private trim(): void {
        for (const [key, entry] of this.entries) {
            if (this.bytes <= this.maxBytes && this.entries.size <= this.maxEntries) break;
            if (entry.ready) this.remove(key);
        }
    }

    /** 対象を除去し、未完了の通信を中断する。 */
    private remove(key: string): void {
        const entry = this.entries.get(key);
        if (!entry) return;
        this.entries.delete(key); this.bytes -= entry.bytes;
        if (!entry.ready) entry.controller.abort();
    }

    /** 破損した内容を再取得できるよう、対象URLのキャッシュを破棄する。 */
    invalidate(path: string): void { this.remove(this.key(path)); }

    /** 保持データと未完了通信をまとめて解放する。 */
    clear(): void { for (const key of this.entries.keys()) this.remove(key); }
}

/** メタデータと検索ベクトルを共有し、音声の試聴回数による追い出しを避ける。 */
export const resourceCache = new ResourceCache(64 * 1024 * 1024);
/** 単音・組み合わせ試聴で音声バイト列を共有する。デコード済み音声は保持しない。 */
export const audioResourceCache = new ResourceCache(64 * 1024 * 1024);

/** JSONを共有バイト列から復元し、利用側の変更を他の機能に伝播させない。 */
export async function fetchJsonResource(path: string, signal?: AbortSignal): Promise<unknown> {
    const bytes = await resourceCache.load(path, signal);
    try { return JSON.parse(new TextDecoder().decode(bytes)); }
    catch (error) { resourceCache.invalidate(path); throw error; }
}
