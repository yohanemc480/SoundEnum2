import { ResourcePathProvider } from '../Resources/ResourcePathProvider.ts';
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

    private readonly excludedIds = new Map<string, Promise<Set<string>>>();
    private readonly versions: readonly string[];
    private exclusionController = new AbortController();

    constructor(paths: ResourcePathProvider, versions: readonly string[] = [])
    {
        this.paths = paths;
        this.versions = [...versions];
    }

    serial = 0;
    pending = new Map<number, { resolve: (value: SearchSuccessResponse) => void; reject: (reason: Error) => void }>();

    /** 既存Workerを破棄し、検証済みデータで初期化して表示用の索引を返す。 */
    async load(): Promise<SearchSourceIndex>
    {
        this.dispose();
        this.exclusionController = new AbortController();
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
        const index = { ...tagData, availableVersions: [...this.versions], events: buildSearchSounds(sounds, hashes, durations) };
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
        const [response, excluded] = await Promise.all([
            this.request({ type: 'search', options }),
            options.excludedVersion ? this.loadExcludedIds(options.excludedVersion) : Promise.resolve(null),
        ]);
        return excluded ? response.results.filter(result => !excluded.has(result.name)) : response.results;
    }

    /** 除外対象のIDを読み込み、同じバージョンの並行検索では通信を共有する。失敗は再試行できる。 */
    private loadExcludedIds(version: string): Promise<Set<string>> {
        if (this.versions.length && !this.versions.includes(version)) return Promise.reject(new Error('Unknown exclusion version'));
        const existing = this.excludedIds.get(version);
        if (existing) return existing;
        const path = new ResourcePathProvider(version).Sounds;
        const pending = fetch(path, { cache: 'no-cache', signal: this.exclusionController.signal })
            .then(async response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return new Set(Object.keys(parseSoundEvents(await response.json())));
            }).catch(error => {
                if (this.excludedIds.get(version) === pending) this.excludedIds.delete(version);
                throw error;
            });
        this.excludedIds.set(version, pending);
        return pending;
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
        this.exclusionController.abort();
        this.excludedIds.clear();
        this.worker?.terminate();
        this.worker = null;
        for (const task of this.pending.values()) task.reject(new Error('Search worker stopped'));
        this.pending.clear();
    }
}
