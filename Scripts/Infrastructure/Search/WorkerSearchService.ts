import type { ResourcePathProvider } from '../Resources/ResourcePathProvider.ts';
import type { SearchSourceIndex } from '../../Model/Search/SearchTypes.ts';
import type { SearchRequest, SearchInitRequest, SearchQueryRequest, SearchReadyResponse, SearchResultsResponse, SearchSuccessResponse, SearchWorkerResponse } from './SearchWorkerProtocol.ts';
import { parseSoundEvents, parseHashMap, parseDurations, parseSearchTags } from '../Resources/ParseResourceData.ts';
import { buildSearchSounds } from '../../Model/Search/BuildSearchSounds.ts';

import type { SearchService } from '../../Contracts/Services/SearchService.ts';
import type { SearchOptions, SearchResult } from '../../Model/Search/SearchTypes.ts';

/** 検索データを読み込み、Workerの初期化・検索要求・破棄を管理する検索サービス。 */
export class WorkerSearchService implements SearchService
{
    readonly paths: ResourcePathProvider;
    worker: Worker | null = null;

    constructor(paths: ResourcePathProvider)
    {
        this.paths = paths;
    }

    serial = 0;
    pending = new Map<number, { resolve: (value: SearchSuccessResponse) => void; reject: (reason: Error) => void }>();

    /** 既存Workerを破棄し、検証済みデータで初期化して表示用の索引を返す。 */
    async load(): Promise<SearchSourceIndex>
    {
        this.dispose();
        const read = async (url: URL): Promise<Response> => {
            const response = await fetch(url, { cache: 'no-cache' });
            if (!response.ok) throw new Error(response.status === 404 ? 'missing' : `HTTP ${response.status}`);
            return response;
        };
        const [tagData, binary, sounds, hashes, durations] = await Promise.all([
            read(new URL(this.paths.SearchTags, location.href)).then(r => r.json()).then(parseSearchTags),
            read(new URL(this.paths.SearchVectors, location.href)).then(r => r.arrayBuffer()),
            read(new URL(this.paths.Sounds, location.href)).then(r => r.json()).then(parseSoundEvents),
            read(new URL(this.paths.Hash, location.href)).then(r => r.json()).then(parseHashMap),
            read(new URL(this.paths.Durations, location.href)).then(r => r.json()).then(parseDurations)
        ]);
        const index = { ...tagData, events: buildSearchSounds(sounds, hashes, durations) };
        // 異なる世代のタグとベクトルを組み合わせて検索しないよう照合する。
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', binary))].map(b => b.toString(16).padStart(2, '0')).join('');
        if (hash !== index.vectorHash) throw new Error('Vector checksum mismatch');
        this.worker = new Worker(new URL('./SoundSearchWorker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = ({ data }: MessageEvent<SearchWorkerResponse>) => {
            const task = this.pending.get(data.id);
            if (!task) return;
            this.pending.delete(data.id);
            if ('error' in data) task.reject(new Error(data.error)); else task.resolve(data);
        };
        this.worker.onerror = () => this.dispose();
        // 大きなバイナリはコピーせずWorkerへ所有権を移す。以後ここでは使用しない。
        await this.request({ type: 'init', index, binary, version: this.paths.Version }, [binary]);
        return index;
    }

    /** 検索結果だけを返し、Workerの応答IDや通信形式を呼び出し元へ漏らさない。 */
    async search(options: SearchOptions): Promise<SearchResult[]> {
        return (await this.request({ type: 'search', options })).results;
    }

    /** 要求IDで応答を対応付け、送信失敗や不正な応答をPromiseの失敗として返す。 */
    request(message: SearchInitRequest, transfer?: Transferable[]): Promise<SearchReadyResponse>;
    request(message: SearchQueryRequest, transfer?: Transferable[]): Promise<SearchResultsResponse>;
    request(message: SearchRequest, transfer: Transferable[] = []): Promise<SearchSuccessResponse>
    {
        return new Promise<SearchSuccessResponse>((resolve, reject) => {
            if (!this.worker) { reject(new Error('Worker unavailable')); return; }
            const id = ++this.serial;
            this.pending.set(id, {
                resolve: response => {
                    if ((message.type === 'init' && 'ready' in response) || (message.type === 'search' && 'results' in response)) resolve(response);
                    else reject(new Error('Unexpected search worker response'));
                },
                reject,
            });
            try { this.worker.postMessage({ ...message, id }, transfer); }
            catch (error) {
                this.pending.delete(id);
                reject(error);
            }
        });
    }

    /** Workerを停止し、応答待ちの処理も失敗として完了させる。繰り返し呼び出せる。 */
    dispose()
    {
        this.worker?.terminate();
        this.worker = null;
        for (const task of this.pending.values()) task.reject(new Error('Search worker stopped'));
        this.pending.clear();
    }
}
