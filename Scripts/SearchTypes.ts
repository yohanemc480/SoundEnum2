/** Minecraftのイベント定義。未使用のメタデータも保持する。 */
export interface SoundEntry {
    name: string;
    type?: string;
    pitch?: number;
    volume?: number;
    weight?: number;
    [key: string]: unknown;
}
export type SoundEvents = Record<string, { sounds?: (string | SoundEntry)[] }>;
export interface SearchCandidate {
    name: string;
    hash: string;
    pitch: number;
    volume: number;
    weight: number;
    duration: number;
}
export interface SearchEvent<T = SearchCandidate> {
    name: string;
    candidates: T[];
}
export interface IndexedCandidate extends SearchCandidate {
    row: number;
}
export interface SearchIndex {
    schemaVersion: number;
    version: string;
    sample?: boolean;
    dimensions: number;
    hashes: string[];
    audioTags: Record<string, string[]>;
    tags: { id: string; textKey?: string }[];
    events: SearchEvent<IndexedCandidate>[];
}
export interface SearchOptions {
    query?: string;
    tags?: string[];
    base?: string;
    excludeMultiple?: boolean;
}
export interface SearchResult {
    name: string;
    candidate: IndexedCandidate;
    score: number | null;
    sameAudio: boolean;
    tags: string[];
    count: number;
}

/** ベクトルの行番号を付ける前の検索データ。 */
export interface SearchSourceIndex extends Omit<SearchIndex, 'hashes' | 'dimensions' | 'events'> {
    events: SearchEvent[];
    vectorHash?: string;
}
export interface SearchTagData extends Omit<SearchSourceIndex, 'events'> {
    vectorHash: string;
}
export interface SearchInitRequest {
    type: 'init';
    index: SearchSourceIndex;
    binary: ArrayBuffer;
    version: string;
}
export interface SearchQueryRequest {
    type: 'search';
    options?: SearchOptions;
}
export type SearchRequest = SearchInitRequest | SearchQueryRequest;
export type SearchWorkerRequest = SearchRequest & { id: number };
export interface SearchReadyResponse { id: number; ready: true }
export interface SearchResultsResponse { id: number; results: SearchResult[] }
export type SearchSuccessResponse = SearchReadyResponse | SearchResultsResponse;
export type SearchWorkerResponse = SearchSuccessResponse | { id: number; error: string };
