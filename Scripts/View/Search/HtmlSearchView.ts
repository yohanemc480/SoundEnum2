import type { WaveformSource } from '../../Contracts/Services/PlaybackResources.ts';
import * as layout from '../Layout/Layout.css.ts';
import * as settingsStyles from '../Components/SoundSettings.css.ts';
import { selectSoundPreview } from '../Components/SelectSoundPreview.ts';
import * as styles from './SearchResults.css.ts';
import { InputSuggestions } from './InputSuggestions.ts';
import { SearchWaveforms } from './SearchWaveforms.ts';
import { Text } from '../../I18n/Text.ts';
import type { SearchCandidate, SearchOptions, SearchSourceIndex } from '../../Model/Search/SearchTypes.ts';
import type { SearchView, SearchViewActions, SearchRow, SearchPage, SearchStatus } from '../../Contracts/Views/SearchView.ts';
const searchElementTypes = {
    form: HTMLFieldSetElement, 'form-container': HTMLFormElement,
    query: HTMLInputElement, base: HTMLInputElement, 'exclude-multiple': HTMLInputElement,
    'clear-query': HTMLButtonElement, 'clear-base': HTMLButtonElement,
    retry: HTMLButtonElement, clear: HTMLButtonElement,
    previous: HTMLButtonElement, next: HTMLButtonElement,
    tags: HTMLElement, list: HTMLElement, 'base-preview': HTMLElement,
    pagination: HTMLElement, status: HTMLElement, page: HTMLElement,
};
function requireElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing element: ${id}`);
    return element;
}
function tagLabel(key: string | undefined): string {
    const label: unknown = key && Object.hasOwn(Text, key) ? Text[key as keyof typeof Text] : undefined;
    if (typeof label !== 'string') throw new Error(`Unknown tag label: ${key}`);
    return label;
}


/** 検索画面のDOM・候補一覧・波形を担当し、ユーザー操作を値として通知する。 */
export class HtmlSearchView implements SearchView {
    private actions?: SearchViewActions;
    private searchStatusTimer?: ReturnType<typeof setTimeout>;
    private readonly lifecycle = new AbortController();
    private index: SearchSourceIndex | null = null;
    private favoriteNames = new Set<string>();
    private favoritesAvailable = false;
    private resultBase = '';
    private displayedReferenceKey = '';
    private referenceCandidateIndex: number | null = null;
    readonly candidatePopover: HTMLElement;
    private candidateAnchor?: HTMLElement;
    private readonly form: HTMLFieldSetElement;
    private readonly baseSuggestions: InputSuggestions;
    private readonly querySuggestions: InputSuggestions;
    private readonly waveforms: SearchWaveforms;

    /** 検索画面のIDから要素を取得する。欠落や想定外の要素型は初期化の誤りとして検出する。 */
    private element<K extends keyof typeof searchElementTypes>(id: K): InstanceType<(typeof searchElementTypes)[K]> {
        const element = requireElement(`search-${id}`);
        if (!(element instanceof searchElementTypes[id])) throw new Error(`Invalid search element: ${id}`);
        return element as InstanceType<(typeof searchElementTypes)[K]>;
    }

    constructor(waveformSource: WaveformSource) {
        this.candidatePopover = document.createElement('section');
        this.candidatePopover.className = styles.soundCandidatesPopover;
        this.candidatePopover.popover = 'auto';
        this.candidatePopover.setAttribute('aria-label', Text.searchAssignedTags);
        document.body.append(this.candidatePopover);
        const positionCandidates = () => this.positionCandidatePopover();
        this.candidatePopover.addEventListener('toggle', positionCandidates, { signal: this.lifecycle.signal });
        window.addEventListener('resize', positionCandidates, { signal: this.lifecycle.signal });
        const closeCandidates = () => this.candidatePopover.hidePopover();
        window.addEventListener('scroll', event => {
            // 候補一覧内のスクロールは維持し、背後が動いたら選択を閉じる。
            if (!(event.target instanceof Node && this.candidatePopover.contains(event.target))) closeCandidates();
        }, { capture: true, signal: this.lifecycle.signal });
        document.querySelectorAll('[data-browser-tab]').forEach(tab => tab.addEventListener('click', () => {
            closeCandidates();
            // 非表示から戻ったときにCSSアニメーションが再開しないよう、途中でも解除する。
            this.element('base-preview').firstElementChild?.classList.remove(styles.referenceArrival);
        }, { signal: this.lifecycle.signal }));

        this.form = this.element('form');
        this.element('base').addEventListener('input', () => { this.referenceCandidateIndex = null; }, { signal: this.lifecycle.signal });
        const query = this.element('query');
        this.querySuggestions = new InputSuggestions(query, {
            label: Text.searchQueryHistory, limit: 7, filterByInput: false,
            onSelect: value => this.actions?.selectQuery(value),
        });
        query.autocomplete = 'off';
        query.addEventListener('blur', () => this.actions?.commitQuery(query.value), { signal: this.lifecycle.signal });
        query.addEventListener('keydown', event => {
            // 候補のEnter選択は共通Viewが処理済みなので、二重に履歴へ記録しない。
            if (event.key === 'Enter' && !event.isComposing && !event.defaultPrevented) {
                event.preventDefault();
                this.actions?.commitQuery(query.value);
                this.querySuggestions.hide();
            }
        }, { signal: this.lifecycle.signal });
        this.baseSuggestions = new InputSuggestions(this.element('base'), { label: Text.searchBaseSuggestions });
        for (const name of ['query', 'base'] as const) {
            this.element(`clear-${name}`).addEventListener('click', () => {
                const input = this.element(name);
                input.value = '';
                input.focus();
                input.dispatchEvent(new Event('input', { bubbles: true }));
                this.baseSuggestions.hide();
                this.querySuggestions.hide();
            });
        }
        const browserPanel = document.querySelector<HTMLElement>(`.${layout.browserPanel}`);
        if (!browserPanel) throw new Error('Missing browser panel');
        this.waveforms = new SearchWaveforms(browserPanel, waveformSource);
        this.element('form-container').addEventListener('submit', event => event.preventDefault(), { signal: this.lifecycle.signal });

        this.form.addEventListener('input', () => this.actions?.changeOptions(this.readOptions()), { signal: this.lifecycle.signal });
        for (const id of ['search-tab', 'favorites-tab']) requireElement(id).addEventListener('click', () => this.actions?.activate(), { signal: this.lifecycle.signal });
        this.element('retry').addEventListener('click', () => this.actions?.retry(), { signal: this.lifecycle.signal });
        this.element('clear').addEventListener('click', () => this.actions?.clear(), { signal: this.lifecycle.signal });
        this.element('previous').addEventListener('click', () => this.actions?.changePage(-1), { signal: this.lifecycle.signal });
        this.element('next').addEventListener('click', () => this.actions?.changePage(1), { signal: this.lifecycle.signal });
    }

    bind(actions: SearchViewActions): () => void {
        this.actions = actions;
        return () => { if (this.actions === actions) this.actions = undefined; };
    }

    /** 入力欄と選択タグを、HTML要素を含まない検索条件へ変換する。 */
    private readOptions(): Required<SearchOptions> {
        return { referenceCandidateIndex: this.referenceCandidateIndex, query: this.element('query').value, referenceSoundName: this.element('base').value,
            tags: [...this.element('tags').querySelectorAll<HTMLInputElement>('input:checked')].map(input => input.value),
            excludeMultipleCandidates: this.element('exclude-multiple').checked };
    }

    initialize(index: SearchSourceIndex, options: Required<SearchOptions>): void {
        index.tags.forEach(tag => tagLabel(tag.textKey));
        this.index = index;
        this.baseSuggestions.setValues(index.events.map(sound => sound.name));
        const tags = this.element('tags');
        tags.replaceChildren();
        for (const tag of index.tags) {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.value = tag.id;
            label.append(checkbox, document.createTextNode(tagLabel(tag.textKey)));
            tags.append(label);
        }
        this.setOptions(options);
        this.form.disabled = false;
    }

    /** 保存された履歴を、入力欄の共通候補ポップアップへ渡す。 */
    showQueryHistory(queries: readonly string[]): void {
        this.querySuggestions.setValues(queries);
    }

    setOptions(options: Required<SearchOptions>): void {
        this.referenceCandidateIndex = options.referenceCandidateIndex ?? null;
        this.element('query').value = options.query;
        this.element('base').value = options.referenceSoundName;
        this.element('exclude-multiple').checked = options.excludeMultipleCandidates;
        this.element('tags').querySelectorAll('input').forEach(input => { input.checked = options.tags.includes(input.value); });
        this.baseSuggestions.hide();
        this.querySuggestions.hide();
    }

    /** 検索待ちの表示予約を解除し、完了後に古い通知が出るのを防ぐ。 */
    private cancelSearchStatus(): void {
        if (this.searchStatusTimer !== undefined) clearTimeout(this.searchStatusTimer);
        this.searchStatusTimer = undefined;
    }

    /** 結果の高さと内容を保ったまま、古い結果へのマウス・キーボード操作を止める。 */
    private setResultsBusy(busy: boolean): void {
        for (const id of ['list', 'base-preview', 'pagination'] as const) {
            const element = this.element(id);
            element.inert = busy;
            element.setAttribute('aria-busy', String(busy));
        }
    }

    /** 再検索中は前の結果を残し、長く待つ場合だけ既存のステータス欄を更新する。 */
    setStatus(status: SearchStatus): void {
        this.cancelSearchStatus();
        this.element('retry').hidden = status !== 'failure' && status !== 'missing';
        if (status === 'ready') return;
        this.candidatePopover.hidePopover();
        if (status === 'searching') {
            this.setResultsBusy(true);
            this.searchStatusTimer = setTimeout(() => {
                this.searchStatusTimer = undefined;
                this.element('status').textContent = Text.searchRunning;
            }, 200);
            return;
        }
        this.setResultsBusy(false);
        this.waveforms.clear();
        this.element('list').replaceChildren();
        this.element('base-preview').replaceChildren();
        this.element('base-preview').hidden = true;
        this.displayedReferenceKey = '';
        this.element('pagination').hidden = true;
        if (status === 'loading') this.form.disabled = true;
        const messages = { loading: Text.searchLoading, failure: Text.searchFailure,
            missing: Text.searchMissing, 'invalid-base': Text.searchInvalidBase };
        this.element('status').textContent = messages[status];
    }

    showPage(page: SearchPage): void {
        this.cancelSearchStatus();
        this.waveforms.clear();
        this.candidatePopover.hidePopover();
        this.resultBase = page.baseline?.name ?? '';
        const list = this.element('list');
        list.replaceChildren(); list.scrollTop = 0;
        const basePreview = this.element('base-preview');
        basePreview.replaceChildren(); basePreview.hidden = !page.baseline;
        this.element('previous').disabled = page.pageIndex === 0;
        this.element('next').disabled = page.pageIndex >= page.pageCount - 1;
        this.element('pagination').hidden = !page.pageCount;
        this.element('page').textContent = Text.searchPage(page.pageIndex + 1, page.pageCount);
        this.element('status').textContent = page.total ? Text.searchResults(page.total, page.pageIndex * 50 + 1, page.pageIndex * 50 + page.rows.length) : Text.searchEmpty;
        // 同じ基準での再検索・ページ切り替えでは弾ませず、候補変更も含めた新しい設定だけを示す。
        const referenceKey = page.baseline ? JSON.stringify([page.baseline.name, page.baseline.referenceCandidateIndex ?? null]) : '';
        if (page.baseline) {
            this.appendRow(page.baseline, basePreview);
            const referenceRow = basePreview.firstElementChild;
            if (referenceRow && referenceKey !== this.displayedReferenceKey) {
                referenceRow.classList.add(styles.referenceArrival);
                // 完了後にクラスを残すと、タブの再表示で同じ演出が再実行される。
                referenceRow.addEventListener('animationend', () => referenceRow.classList.remove(styles.referenceArrival), { once: true });
            }
        }
        this.displayedReferenceKey = referenceKey;
        for (const row of page.rows) this.appendRow(row, list);
        this.setResultsBusy(false);
    }

    showFavorites(rows: readonly SearchRow[], available: boolean): void {
        this.favoriteNames = new Set(rows.map(row => row.name));
        this.favoritesAvailable = available;
        const list = requireElement('favorites-list');
        list.querySelectorAll('canvas').forEach(canvas => this.waveforms.unobserve(canvas));
        list.replaceChildren();
        requireElement('favorites-status').textContent = !available ? Text.favoritesFailure : !this.index ? Text.searchLoading : rows.length ? '' : Text.favoritesEmpty;
        if (this.index && available) for (const row of rows) this.appendRow(row, list);
        document.querySelectorAll<HTMLButtonElement>('[data-favorite]').forEach(button => this.updateFavoriteButton(button));
    }

    /** 表示用のお気に入り状態から、星印・操作ラベル・利用可否を更新する。 */
    private updateFavoriteButton(button: HTMLButtonElement): void {
        const saved = this.favoriteNames.has(button.dataset.favorite ?? '');
        button.textContent = saved ? '★' : '☆';
        button.setAttribute('aria-pressed', String(saved));
        button.title = saved ? Text.favoritesRemove : Text.favoritesAdd;
        button.setAttribute('aria-label', `${button.title}: ${button.dataset.favorite}`);
        button.disabled = !this.favoritesAvailable;
    }

    activateSearchTab(): void { requireElement('search-tab').click(); }


    /** グローバル購読、補完UI、波形監視をまとめて解放する。 */
    dispose(): void {
        this.cancelSearchStatus();
        this.setResultsBusy(false);
        this.actions = undefined;
        this.lifecycle.abort();
        this.waveforms.clear();
        this.baseSuggestions.dispose();
        this.querySuggestions.dispose();
        this.candidatePopover.remove();
    }
    /** タグIDを表示名付きのバッジに変換する。タグがない場合もその旨を表示する。 */
    private createTagBadges(tags: readonly string[])
    {
        const badges = document.createElement('span');
        badges.className = styles.soundTagBadges;
        badges.setAttribute('aria-label', Text.searchAssignedTags);
        for (const id of tags) {
            const badge = document.createElement('span');
            badge.className = styles.soundTagBadge;
            badge.textContent = tagLabel(this.index?.tags.find(tag => tag.id === id)?.textKey);
            badges.append(badge);
        }
        if (!tags.length) {
            const empty = document.createElement('span');
            empty.className = styles.soundTagEmpty;
            empty.textContent = Text.searchNoTags;
            badges.append(empty);
        }
        return badges;
    }

    /** 押したボタンに隣接させ、上下の空きに応じて方向と一覧の高さを調整する。 */
    private positionCandidatePopover(): void {
        const panel = this.candidatePopover;
        if (!panel.matches(':popover-open') || !this.candidateAnchor) return;
        const anchor = this.candidateAnchor.getBoundingClientRect();
        const margin = 12;
        const gap = 8;
        const below = Math.max(0, window.innerHeight - anchor.bottom - gap - margin);
        const above = Math.max(0, anchor.top - gap - margin);
        // 前回の高さ制限を解除してから、今回の内容に必要な高さを測る。
        panel.style.maxHeight = `${Math.max(0, Math.min(520, window.innerHeight - margin * 2))}px`;
        const preferredHeight = panel.offsetHeight;
        const useAbove = below < preferredHeight && above > below;
        const available = useAbove ? above : below;
        // ボタン自体が画面外なら、画面内に収めることを優先する。
        if (available >= 80) panel.style.maxHeight = `${Math.min(preferredHeight, available)}px`;
        const top = useAbove ? anchor.top - gap - panel.offsetHeight : anchor.bottom + gap;
        panel.style.left = `${Math.max(margin, Math.min(anchor.right - panel.offsetWidth, window.innerWidth - panel.offsetWidth - margin))}px`;
        panel.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - panel.offsetHeight - margin))}px`;
    }

    /** 候補表示の見出しと閉じる操作を用意し、表示元のボタンに関連付ける。 */
    private prepareCandidatePopover(name: string, anchor: HTMLElement): HTMLElement {
        this.candidateAnchor = anchor;
        const panel = this.candidatePopover;
        panel.replaceChildren();
        const heading = document.createElement('div'); heading.className = layout.sectionHeading;
        const title = document.createElement('h2'); title.textContent = name;
        const close = document.createElement('button'); close.type = 'button'; close.className = `${settingsStyles.settingsButton} ${settingsStyles.closeButton}`;
        close.setAttribute('aria-label', Text.close);
        close.popoverTargetElement = panel; close.popoverTargetAction = 'hide';
        heading.append(title, close); panel.append(heading);
        panel.setAttribute('aria-label', name);
        return panel;
    }

    /** 再生候補と重みに比例する選択確率だけを並べ、各音を試聴できるようにする。 */
    private showCandidateProbabilities(name: string, anchor: HTMLElement): void {
        const candidates = this.index?.events.find(sound => sound.name === name)?.candidates ?? [];
        const totalWeight = candidates.reduce((total, candidate) => total + candidate.weight, 0);
        const panel = this.prepareCandidatePopover(name, anchor);
        const list = document.createElement('ul');
        list.className = styles.candidateProbabilityList;
        candidates.forEach((candidate, i) => {
            const row = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button'; button.className = styles.candidateProbabilityPreview;
            button.setAttribute('aria-label', Text.searchPreviewCandidate(i + 1, candidate.name));
            const label = document.createElement('span'); label.textContent = `${i + 1}. ${candidate.name}`;
            const probability = document.createElement('span');
            probability.className = styles.candidateProbability;
            probability.textContent = Text.searchCandidateProbability(candidate.weight / totalWeight);
            button.append(label, probability);
            button.addEventListener('click', () => { selectSoundPreview(button); this.actions?.preview({ name, candidate, candidateIndex: i }); });
            row.append(button); list.append(row);
        });
        panel.append(list);
        panel.showPopover();
        this.positionCandidatePopover();
    }

    /** 類似検索の基準を選ぶために、候補の試聴・タグ・検索操作を表示する。 */
    showCandidateChoices(name: string, anchor: HTMLElement = this.element('base')): void {
        const candidates = this.index?.events.find(sound => sound.name === name)?.candidates ?? [];
        const panel = this.prepareCandidatePopover(name, anchor);
        candidates.forEach((candidate, i) => {
            const button = document.createElement('button'); button.type = 'button'; button.className = styles.soundTagCandidate;
            const label = document.createElement('span');
            label.textContent = Text.searchCandidateName(i + 1, candidate.name, candidate.pitch);
            button.setAttribute('aria-label', Text.searchPreviewCandidate(i + 1, candidate.name));
            button.append(label, this.createTagBadges(this.index?.audioTags[candidate.hash] ?? []));
            button.addEventListener('click', () => { selectSoundPreview(button); this.actions?.preview({ name, candidate, candidateIndex: i }); });
            const candidateRow = document.createElement('div'); candidateRow.className = styles.candidateRow;
            const find = document.createElement('button'); find.type = 'button'; find.className = styles.candidateSearch;
            find.textContent = Text.searchSimilar;
            find.setAttribute('aria-label', `${Text.searchSimilar}: ${candidate.name}`);
            find.addEventListener('click', () => {
                panel.hidePopover();
                this.actions?.searchSimilar(name, i);
            });
            candidateRow.append(button, find);
            panel.append(candidateRow);
        });
        panel.showPopover();
        this.positionCandidatePopover();
    }

    /** 結果行と操作ボタンを描画し、試聴・候補表示・波形監視を接続する。業務操作は値で通知する。 */
    private appendRow(entry: SearchRow, container: HTMLElement) {
            const candidates = this.index?.events.find(event => event.name === entry.name)?.candidates ?? [];
            const row = document.createElement('div'); row.className = styles.searchRow;
            const preview = document.createElement('button'); preview.type = 'button'; preview.className = styles.searchPreview;
            const name = document.createElement('span'); name.textContent = entry.name;
            const detail = document.createElement('small');
            detail.className = styles.searchSimilarity;
            detail.textContent = [entry.score === null ? '' : Text.searchScore(Math.round(entry.score * 100)),
                entry.sameAudio ? Text.searchSameAudio : ''].filter(Boolean).join(' · ');
            const metadata = document.createElement('span'); metadata.className = styles.searchRowMetadata;
            if (detail.textContent) metadata.append(detail);
            if (entry.referenceCandidateIndex !== undefined && entry.candidate) {
                const reference = document.createElement('small');
                reference.textContent = Text.searchSelectedCandidate(entry.referenceCandidateIndex + 1, entry.candidate.name);
                metadata.append(reference);
            }
            if (candidates.length) metadata.append(this.createTagBadges(entry.tags));
            else metadata.textContent = Text.favoritesUnavailable;
            preview.append(name);
            preview.disabled = !candidates.length;
            const playCandidate = (candidate: SearchCandidate | null, button: HTMLButtonElement) => {
                selectSoundPreview(button);
                this.actions?.preview({ name: entry.name, candidate, candidateIndex: entry.referenceCandidateIndex });
            };
            preview.addEventListener('click', () => playCandidate(entry.referenceCandidateIndex === undefined ? null : entry.candidate ?? null, preview));
            const similar = document.createElement('button'); similar.type = 'button'; similar.textContent = Text.searchSimilar;
            similar.className = styles.similarSearchButton;
            similar.disabled = !candidates.length;
            similar.setAttribute('aria-label', Text.searchSimilarTo(entry.name));
            if (candidates.length > 1) {
                const badge = document.createElement('span');
                badge.className = styles.similarSearchCandidateBadge;
                badge.textContent = String(candidates.length);
                badge.setAttribute('aria-hidden', 'true');
                similar.append(badge);
                similar.setAttribute('aria-label', `${Text.searchSimilarTo(entry.name)}（${Text.searchCandidate(candidates.length)}）`);
            }
            similar.addEventListener('click', () => {
                if (candidates.length <= 1) this.actions?.searchSimilar(entry.name);
                else this.showCandidateChoices(entry.name, similar);
            });
            const main = document.createElement('div'); main.className = styles.searchRowMain;
            main.classList.toggle(styles.searchRowBase, entry.name === this.resultBase && !requireElement('favorites-panel').contains(container));
            main.addEventListener('click', event => {
                if (event.target instanceof Element && event.target.closest('button')) return;
                preview.click();
            });
            const content = document.createElement('div'); content.className = styles.searchRowContent;
            const heading = document.createElement('div'); heading.className = styles.searchRowHeading;
            heading.append(preview);
            content.append(heading, metadata);
            const actions = document.createElement('div'); actions.className = styles.searchRowActions;
            const favorite = document.createElement('button'); favorite.type = 'button';
            favorite.dataset.favorite = entry.name;
            this.updateFavoriteButton(favorite);
            favorite.addEventListener('click', () => this.actions?.toggleFavorite(entry.name));
            const add = document.createElement('button'); add.type = 'button';
            add.className = styles.compositionAdd; add.title = Text.compositionAdd;
            add.setAttribute('aria-label', `${Text.compositionAdd}: ${entry.name}`);
            add.disabled = !candidates.length;
            add.addEventListener('click', () => this.actions?.addToComposition(entry.name));
            actions.append(favorite, add, similar);
            const waveform = document.createElement('canvas');
            waveform.className = styles.searchRowWaveform;
            waveform.setAttribute('aria-hidden', 'true');
            main.append(content, waveform, actions); row.append(main);
            if (entry.candidateCount > 1) {
                const trigger = document.createElement('button'); trigger.type = 'button';
                trigger.textContent = Text.searchCandidate(entry.candidateCount);
                trigger.setAttribute('aria-label', Text.searchCandidateDetails(entry.candidateCount));
                trigger.title = Text.searchCandidateDetails(entry.candidateCount);
                trigger.addEventListener('click', () => {
                    this.showCandidateProbabilities(entry.name, trigger);
                });
                trigger.className = styles.searchCandidateTrigger;
                heading.append(trigger);
            }
            container.append(row);
            if (entry.candidate) this.waveforms.observe(waveform, entry.referenceCandidateIndex === undefined ? candidates.map(candidate => candidate.hash) : [entry.candidate.hash], entry.candidate.hash);
    }
}
