import type { SearchSourceIndex, SearchOptions, SearchResult } from '../../Model/Search/SearchTypes.ts';

/** 索引とベクトルをWorkerへ渡す初期化要求。 */
export interface SearchInitRequest {
    type: 'init';
    index: SearchSourceIndex;
    binary: ArrayBuffer;
    version: string;
}
/** 初期化済みのWorkerに対する検索要求。 */
export interface SearchQueryRequest {
    type: 'search';
    options?: SearchOptions;
}
/** 要求IDを付与する前のWorker操作。 */
export type SearchRequest = SearchInitRequest | SearchQueryRequest;
/** 応答を待機中の処理へ対応付けるID付き要求。 */
export type SearchWorkerRequest = SearchRequest & { id: number };
/** 指定した初期化要求が正常に完了したことを通知する。 */
export interface SearchReadyResponse { id: number; ready: true }
/** 検索要求IDとその検索結果。 */
export interface SearchResultsResponse { id: number; results: SearchResult[] }
/** Workerが返す初期化または検索の成功応答。 */
export type SearchSuccessResponse = SearchReadyResponse | SearchResultsResponse;
/** Workerの成功応答、または同じ要求IDに対応するエラー。 */
export type SearchWorkerResponse = SearchSuccessResponse | { id: number; error: string };
