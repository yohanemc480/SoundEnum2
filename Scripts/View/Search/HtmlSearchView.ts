import * as layout from '../Layout/Layout.css.ts';
import * as settingsStyles from '../Settings/Settings.css.ts';
import { compositionRow } from '../Composition/Compositions.css.ts';
import * as styles from './SearchResults.css.ts';
import { SoundAutocomplete } from './SoundAutocomplete.ts';
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
    private readonly lifecycle = new AbortController();
    private index: SearchSourceIndex | null = null;
    private favoriteNames = new Set<string>();
    private favoritesAvailable = false;
    private resultBase = '';
    readonly candidatePopover: HTMLElement;
    private candidateAnchor?: HTMLElement;
    private readonly form: HTMLFieldSetElement;
    private readonly autocomplete: SoundAutocomplete;
    private readonly waveforms: SearchWaveforms;

    /** 検索画面のIDから要素を取得する。欠落や想定外の要素型は初期化の誤りとして検出する。 */
    private element<K extends keyof typeof searchElementTypes>(id: K): InstanceType<(typeof searchElementTypes)[K]> {
        const element = requireElement(`search-${id}`);
        if (!(element instanceof searchElementTypes[id])) throw new Error(`Invalid search element: ${id}`);
        return element as InstanceType<(typeof searchElementTypes)[K]>;
    }

    constructor() {
        this.candidatePopover = document.createElement('section');
        this.candidatePopover.className = styles.soundCandidatesPopover;
        this.candidatePopover.popover = 'auto';
        this.candidatePopover.setAttribute('aria-label', Text.searchAssignedTags);
        document.body.append(this.candidatePopover);
        this.candidatePopover.addEventListener('toggle', () => {
            if (!this.candidatePopover.matches(':popover-open') || !this.candidateAnchor) return;
            const anchor = this.candidateAnchor.getBoundingClientRect();
            const panel = this.candidatePopover;
            panel.style.left = `${Math.max(12, Math.min(anchor.right - panel.offsetWidth, window.innerWidth - panel.offsetWidth - 12))}px`;
            panel.style.top = `${Math.max(12, Math.min(anchor.bottom + 8, window.innerHeight - panel.offsetHeight - 12))}px`;
        });
        const closeCandidates = () => this.candidatePopover.hidePopover();
        window.addEventListener('resize', closeCandidates, { signal: this.lifecycle.signal });
        window.addEventListener('scroll', event => {
            if (!(event.target instanceof Node && this.candidatePopover.contains(event.target))) closeCandidates();
        }, { capture: true, signal: this.lifecycle.signal });
        document.querySelectorAll('[data-browser-tab]').forEach(tab => tab.addEventListener('click', closeCandidates, { signal: this.lifecycle.signal }));

        this.form = this.element('form');
        this.autocomplete = new SoundAutocomplete(this.element('base'));
        for (const name of ['query', 'base'] as const) {
            this.element(`clear-${name}`).addEventListener('click', () => {
                const input = this.element(name);
                input.value = '';
                input.focus();
                input.dispatchEvent(new Event('input', { bubbles: true }));
                this.autocomplete.hide();
            });
        }
        const browserPanel = document.querySelector<HTMLElement>(`.${layout.browserPanel}`);
        if (!browserPanel) throw new Error('Missing browser panel');
        this.waveforms = new SearchWaveforms(browserPanel);
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
        return { query: this.element('query').value, referenceSoundName: this.element('base').value,
            tags: [...this.element('tags').querySelectorAll<HTMLInputElement>('input:checked')].map(input => input.value),
            excludeMultipleCandidates: this.element('exclude-multiple').checked };
    }

    initialize(index: SearchSourceIndex, options: Required<SearchOptions>): void {
        index.tags.forEach(tag => tagLabel(tag.textKey));
        this.index = index;
        this.autocomplete.setNames(index.events.map(sound => sound.name));
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

    setOptions(options: Required<SearchOptions>): void {
        this.element('query').value = options.query;
        this.element('base').value = options.referenceSoundName;
        this.element('exclude-multiple').checked = options.excludeMultipleCandidates;
        this.element('tags').querySelectorAll('input').forEach(input => { input.checked = options.tags.includes(input.value); });
        this.autocomplete.hide();
    }

    setStatus(status: SearchStatus): void {
        this.element('retry').hidden = status !== 'failure' && status !== 'missing';
        if (status === 'ready') return;
        this.candidatePopover.hidePopover();
        this.waveforms.clear();
        this.element('list').replaceChildren();
        this.element('base-preview').replaceChildren();
        this.element('base-preview').hidden = true;
        this.element('pagination').hidden = true;
        if (status === 'loading') this.form.disabled = true;
        const messages = { loading: Text.searchLoading, searching: Text.searchRunning,
            failure: Text.searchFailure, missing: Text.searchMissing, 'invalid-base': Text.searchInvalidBase };
        this.element('status').textContent = messages[status];
    }

    showPage(page: SearchPage): void {
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
        if (page.baseline) this.appendRow(page.baseline, basePreview);
        for (const row of page.rows) this.appendRow(row, list);
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

    /** 移行中の組み合わせ画面からも利用する表示処理。ボタンをPresenterへ渡さない。 */
    selectPreviewButton(button: HTMLButtonElement): void {
        document.querySelectorAll(`.${layout.browserPanel} .${styles.selected}, .${compositionRow} .${styles.selected}`).forEach(element => element.classList.remove(styles.selected));
        this.candidatePopover.querySelectorAll(`.${styles.selected}`).forEach(element => element.classList.remove(styles.selected));
        button.classList.add(styles.selected);
    }

    /** グローバル購読、補完UI、波形監視をまとめて解放する。 */
    dispose(): void {
        this.actions = undefined;
        this.lifecycle.abort();
        this.waveforms.clear();
        this.autocomplete.dispose();
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
            if (candidates.length) metadata.append(this.createTagBadges(entry.tags));
            else metadata.textContent = Text.favoritesUnavailable;
            preview.append(name);
            preview.disabled = !candidates.length;
            const playCandidate = (candidate: SearchCandidate | null, button: HTMLButtonElement) => {
                this.selectPreviewButton(button);
                this.actions?.preview({ name: entry.name, candidate });
            };
            preview.addEventListener('click', () => playCandidate(null, preview));
            const similar = document.createElement('button'); similar.type = 'button'; similar.textContent = Text.searchSimilar;
            similar.disabled = !candidates.length;
            similar.setAttribute('aria-label', Text.searchSimilarTo(entry.name));
            similar.addEventListener('click', () => {
                this.actions?.searchSimilar(entry.name);
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
            const add = document.createElement('button'); add.type = 'button'; add.textContent = '+';
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
                trigger.setAttribute('aria-label', Text.searchCandidateTags(entry.candidateCount));
                trigger.title = Text.searchCandidateTags(entry.candidateCount);
                trigger.popoverTargetElement = this.candidatePopover;
                trigger.popoverTargetAction = 'show';
                trigger.addEventListener('click', () => {
                    this.candidateAnchor = trigger;
                    const panel = this.candidatePopover;
                    panel.replaceChildren();
                    const heading = document.createElement('div'); heading.className = layout.sectionHeading;
                    const title = document.createElement('h2'); title.textContent = entry.name;
                    const close = document.createElement('button'); close.type = 'button'; close.className = `${settingsStyles.settingsButton} ${settingsStyles.closeButton}`;
                    close.setAttribute('aria-label', Text.close);
                    close.popoverTargetElement = panel; close.popoverTargetAction = 'hide';
                    heading.append(title, close); panel.append(heading);
                    candidates.forEach((candidate, i) => {
                        const button = document.createElement('button'); button.type = 'button'; button.className = styles.soundTagCandidate;
                        const label = document.createElement('span');
                        label.textContent = Text.searchCandidateName(i + 1, candidate.name, candidate.pitch);
                        button.setAttribute('aria-label', Text.searchPreviewCandidate(i + 1, candidate.name));
                        button.append(label, this.createTagBadges(this.index?.audioTags[candidate.hash] ?? []));
                        button.addEventListener('click', () => playCandidate(candidate, button));
                        panel.append(button);
                    });
                    // 別の行から開き直した場合も、新しい位置でtoggleイベントを受ける。
                    panel.hidePopover();
                });
                trigger.className = styles.searchCandidateTrigger;
                heading.append(trigger);
            }
            container.append(row);
            if (entry.candidate) this.waveforms.observe(waveform, candidates.map(candidate => candidate.hash), entry.candidate.hash);
    }
}
