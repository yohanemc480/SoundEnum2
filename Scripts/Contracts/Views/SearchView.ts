import type { SearchCandidate, SearchOptions, SearchResult, SearchSourceIndex } from '../../Model/Search/SearchTypes.ts';
import type { SoundPreviewRequest } from '../Services/SoundPreviewService.ts';

/** 表示用の検索行。利用できないお気に入りはcandidateを持たない。 */
export type SearchRow = Omit<SearchResult, 'candidate'> & { candidate?: SearchCandidate };
/** 表示文言へ変換する検索状態。具体的な文言とDOMはViewが決める。 */
export type SearchStatus = 'loading' | 'searching' | 'ready' | 'missing' | 'failure' | 'invalid-base';

/** 基準サウンドを別枠にした表示ページ。pageIndexは0始まり、totalは基準を除く件数。 */
export interface SearchPage {
    rows: readonly SearchRow[];
    baseline: SearchRow | null;
    total: number;
    pageIndex: number;
    pageCount: number;
}

/** ViewがPresenterへ通知する操作。DOMだけの操作はView内に留める。 */
export interface SearchViewActions {
    changeOptions(options: Required<SearchOptions>): void;
    commitQuery(query: string): void;
    selectQuery(query: string): void;
    activate(): void;
    retry(): void;
    clear(): void;
    changePage(delta: -1 | 1): void;
    searchSimilar(name: string): void;
    preview(request: SoundPreviewRequest): void;
    addToComposition(name: string): void;
    toggleFavorite(name: string): void;
}

/** Presenterから検索画面を更新する契約。HTML要素を外部に公開しない。 */
export interface SearchView {
    /** 操作を購読し、購読解除用の関数を返す。 */
    bind(actions: SearchViewActions): () => void;
    initialize(index: SearchSourceIndex, options: Required<SearchOptions>): void;
    setOptions(options: Required<SearchOptions>): void;
    showQueryHistory(queries: readonly string[]): void;
    setStatus(status: SearchStatus): void;
    showPage(page: SearchPage): void;
    showFavorites(rows: readonly SearchRow[], available: boolean): void;
    activateSearchTab(): void;
}
