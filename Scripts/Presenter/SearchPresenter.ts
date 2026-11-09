import { restoreSearchOptions } from '../Model/Search/SearchPreferences.ts';
import { FavoriteSounds } from '../Model/Favorites/FavoriteSounds.ts';
import type { FavoriteSoundsStore } from '../Contracts/Services/FavoriteSoundsStore.ts';
import type { SearchOptions, SearchResult, SearchSourceIndex } from '../Model/Search/SearchTypes.ts';
import type { SearchView, SearchRow } from '../Contracts/Views/SearchView.ts';
import type { SearchService } from '../Contracts/Services/SearchService.ts';
import type { SearchPreferencesStore } from '../Contracts/Services/SearchPreferencesStore.ts';
import type { CompositionActions } from '../Contracts/Services/CompositionActions.ts';
import type { SoundPreviewRequest, SoundPreviewService } from '../Contracts/Services/SoundPreviewService.ts';
import type { SearchInteractionServices } from '../Contracts/Services/SearchInteractionServices.ts';

const emptyOptions = (): Required<SearchOptions> => ({ query: '', tags: [], referenceSoundName: '', referenceCandidateIndex: null, excludeMultipleCandidates: false });

/** 検索条件・要求の順序・ページを管理し、HTMLを知らずに表示と他機能を調整する。 */
export class SearchPresenter {
    private queryHistory: string[] = [];
    private index: SearchSourceIndex | null = null;
    private options = emptyOptions();
    private results: SearchResult[] = [];
    private resultReferenceName = '';
    private resultCandidateIndex: number | null = null;
    private pageIndex = 0;
    private requestId = 0;
    private loading: Promise<void> | null = null;
    private cancelScheduledSearch?: () => void;
    private readonly unbind: () => void;
    private disposed = false;
    private readonly pendingFavorites = new Set<string>();

    private readonly view: SearchView;
    private readonly searchService: SearchService;
    private readonly preferences: SearchPreferencesStore;
    private readonly composition: CompositionActions;
    private readonly previewService: SoundPreviewService;
    private readonly favoritesStore: FavoriteSoundsStore | null;
    private readonly favorites: FavoriteSounds | null;
    private readonly interactions: SearchInteractionServices;

    constructor(
        view: SearchView,
        searchService: SearchService,
        preferences: SearchPreferencesStore,
        composition: CompositionActions,
        previewService: SoundPreviewService,
        favorites: FavoriteSoundsStore | null,
        interactions: SearchInteractionServices,
    ) {
        this.view = view;
        this.searchService = searchService;
        this.preferences = preferences;
        this.composition = composition;
        this.previewService = previewService;
        this.favoritesStore = favorites;
        try {
            this.favorites = favorites ? new FavoriteSounds() : null;
            if (favorites) this.favorites?.replace(favorites.read());
        } catch { this.favorites = null; }
        this.interactions = interactions;
        this.unbind = view.bind({
            activate: () => { void this.load(); },
            changeOptions: options => this.changeOptions(options),
            commitQuery: query => this.commitQuery(query),
            selectQuery: query => {
                this.commitQuery(this.options.query);
                this.setOptions({ ...this.options, query });
                this.commitQuery(query);
                void this.search();
            },
            retry: () => { void this.retry(); },
            clear: () => { this.setOptions(emptyOptions()); void this.search(); },
            changePage: delta => { this.pageIndex += delta; this.render(); },
            searchSimilar: (name, candidateIndex) => { void this.searchSimilar(name, candidateIndex); },
            preview: request => { void this.preview(request); },
            addToComposition: name => this.composition.add(name),
            toggleFavorite: name => { void this.toggleFavorite(name); },
        });
    }

    /** 確定した検索語だけを新しい順に7件保持し、空欄や重複を除いて保存する。 */
    private commitQuery(query: string): void {
        const trimmed = query.trim();
        if (!trimmed || this.disposed) return;
        this.queryHistory = [trimmed, ...this.queryHistory.filter(item => item !== trimmed)].slice(0, 7);
        this.preferences.saveQueryHistory(this.queryHistory);
        this.view.showQueryHistory(this.queryHistory);
    }

    /** 同時に呼ばれても読み込みは共有する。初回だけ保存済みの条件を復元する。 */
    load(): Promise<void> {
        if (this.disposed) return Promise.resolve();
        if (this.loading) return this.loading;
        if (this.index) { this.renderFavorites(); return Promise.resolve(); }
        this.loading = this.loadIndex().finally(() => { this.loading = null; });
        return this.loading;
    }

    /** 検索データを読み込み、利用可能な保存条件を復元する。失敗時は再試行できる状態を表示する。 */
    private async loadIndex(): Promise<void> {
        ++this.requestId;
        this.view.setStatus('loading');
        try {
            const index = await this.searchService.load();
            if (this.disposed) return;
            const saved = this.preferences.read();
            this.options = restoreSearchOptions(saved, index);
            this.index = index;
            this.composition.setEvents(index.events);
            this.view.initialize(index, this.options);
            this.queryHistory = this.preferences.readQueryHistory();
            this.view.showQueryHistory(this.queryHistory);
            await this.search();
            this.renderFavorites();
        } catch (error) {
            if (this.disposed) return;
            this.index = null;
            this.searchService.dispose();
            this.view.setStatus(error instanceof Error && error.message === 'missing' ? 'missing' : 'failure');
        }
    }

    /** 待機中の検索を取り消し、条件を正規化して保存と入力欄へ反映する。 */
    private setOptions(options: Required<SearchOptions>): void {
        this.cancelScheduledSearch?.();
        this.options = { ...options, tags: [...options.tags], referenceSoundName: options.referenceSoundName.trim() };
        this.preferences.save(this.options);
        this.view.setOptions(this.options);
    }

    /** 入力変更を保存し、古い応答を無効化してから検索を120ms後に予約する。 */
    private changeOptions(options: Required<SearchOptions>): void {
        // 入力された時点で古い結果を無効化する。待機中に以前の応答が届いても表示しない。
        ++this.requestId;
        this.cancelScheduledSearch?.();
        this.options = { ...options, tags: [...options.tags], referenceSoundName: options.referenceSoundName.trim() };
        this.preferences.save(this.options);
        this.cancelScheduledSearch = this.interactions.schedule(() => { void this.search(); }, 120);
    }

    /** 読み込み中の二重実行を避け、索引を取得し直して検索を再開する。 */
    private async retry(): Promise<void> {
        if (this.loading || this.disposed) return;
        this.cancelScheduledSearch?.();
        this.index = null;
        await this.load();
    }

    /** 他画面からの類似検索も、複数候補なら基準選択を先に表示する。 */
    async requestSimilar(name: string): Promise<void> {
        await this.load();
        if (!this.index || this.disposed) return;
        if ((this.index.events.find(sound => sound.name === name)?.candidates.length ?? 0) > 1) {
            this.view.activateSearchTab();
            this.view.showCandidateChoices(name);
        } else await this.searchSimilar(name);
    }

    /** 値だけで類似検索を依頼する。読み込み前に呼ばれても指定した基準を維持する。 */
    async searchSimilar(name: string, candidateIndex?: number): Promise<void> {
        await this.load();
        if (!this.index || this.disposed) return;
        this.setOptions({ ...emptyOptions(), referenceSoundName: name, referenceCandidateIndex: candidateIndex ?? null });
        this.view.activateSearchTab();
        await this.search();
    }

    /** 現在の条件で検索し、最新の要求に対応する結果だけを表示する。基準が不正なら検索しない。 */
    private async search(): Promise<void> {
        if (!this.index || this.disposed) return;
        this.cancelScheduledSearch?.();
        const id = ++this.requestId;
        const options = { ...this.options, tags: [...this.options.tags] };
        this.preferences.save(options);
        if (options.referenceSoundName && !this.index.events.some(sound => sound.name === options.referenceSoundName)) {
            this.view.setStatus('invalid-base'); return;
        }
        this.view.setStatus('searching');
        try {
            const results = await this.searchService.search(options);
            if (id !== this.requestId || this.disposed) return;
            this.results = results.filter(result => result.name !== options.referenceSoundName);
            this.resultReferenceName = options.referenceSoundName;
            this.resultCandidateIndex = options.referenceCandidateIndex ?? null;
            this.pageIndex = 0;
            this.view.setStatus('ready');
            this.render();
        } catch {
            if (id === this.requestId && !this.disposed) this.view.setStatus('failure');
        }
    }

    /** サウンド名から表示行を作る。利用できないお気に入りも候補なしの行として残す。 */
    private createRow(name: string, candidateIndex: number | null = null): SearchRow {
        const sound = this.index?.events.find(sound => sound.name === name);
        const candidate = sound?.candidates[candidateIndex ?? 0];
        return { name, candidate, ...(candidateIndex !== null ? { referenceCandidateIndex: candidateIndex } : {}), candidateCount: sound?.candidates.length ?? 0, score: null,
            sameAudio: false, tags: candidate ? this.index!.audioTags[candidate.hash] : [] };
    }

    /** ページ番号を有効範囲へ収め、基準音を別枠にした50件分の結果とお気に入りを表示する。 */
    private render(): void {
        if (!this.index || this.disposed) return;
        const pageCount = Math.ceil(this.results.length / 50);
        this.pageIndex = Math.max(0, Math.min(this.pageIndex, pageCount - 1));
        this.view.showPage({ rows: this.results.slice(this.pageIndex * 50, (this.pageIndex + 1) * 50),
            baseline: this.resultReferenceName ? this.createRow(this.resultReferenceName, this.resultCandidateIndex) : null,
            total: this.results.length, pageIndex: this.pageIndex, pageCount });
        this.renderFavorites();
    }

    /** 保存された名前を表示行へ変換し、保存機能が利用可能かどうかとともにViewへ渡す。 */
    private renderFavorites(): void {
        if (!this.disposed) this.view.showFavorites((this.favorites?.read() ?? []).map(name => this.createRow(name)), this.favorites !== null);
    }

    /** 削除確認と保存を行い、成功時だけ表示を更新する。同じ音への確認待ち操作は重複させない。 */
    private async toggleFavorite(name: string): Promise<void> {
        if (this.disposed || !this.favorites || !this.favoritesStore || this.pendingFavorites.has(name)) return;
        this.pendingFavorites.add(name);
        try {
            if (this.favorites.has(name) && !await this.interactions.confirmFavoriteRemoval(name)) return;
            if (this.disposed) return;
            const next = this.favorites.withToggled(name);
            this.favoritesStore.save(next);
            this.favorites.replace(next);
            this.renderFavorites();
        } catch { if (!this.disposed) this.interactions.notifyFailure('favorites'); }
        finally { this.pendingFavorites.delete(name); }
    }

    /** 組み合わせ再生を止めて試聴する。選択ボタン等の表示はViewに任せる。 */
    async preview(request: SoundPreviewRequest): Promise<void> {
        if (this.disposed) return;
        this.composition.stop();
        try { await this.previewService.play(request); }
        catch { if (!this.disposed) this.interactions.notifyFailure('preview'); }
    }

    /** 待機・購読・Workerを解放し、処理中の応答による表示更新も無効化する。 */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        ++this.requestId;
        this.cancelScheduledSearch?.();
        this.unbind();
        this.searchService.dispose();
    }
}
