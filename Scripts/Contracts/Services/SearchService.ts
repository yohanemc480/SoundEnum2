import type { SearchOptions, SearchResult, SearchSourceIndex } from '../../Model/Search/SearchTypes.ts';

/** 検索データの読み込みと検索を提供する境界。Worker等の通信方式は実装側に隠す。 */
export interface SearchService {
    load(): Promise<SearchSourceIndex>;
    search(options: SearchOptions): Promise<SearchResult[]>;
    dispose(): void;
}
