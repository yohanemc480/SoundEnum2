import * as styles from './InputSuggestions.css.ts';

/** 候補の表示名・件数・絞り込みと、選択時の処理を指定する。 */
export interface InputSuggestionsOptions {
    label: string;
    limit?: number;
    filterByInput?: boolean;
    onSelect?: (value: string) => void;
}

/** 入力欄に候補ポップアップを表示し、マウスとキーボードで選択する共通View。 */
export class InputSuggestions {
    private readonly lifecycle = new AbortController();
    readonly input: HTMLInputElement;
    readonly list: HTMLDivElement;
    private values: readonly string[];
    private readonly options: InputSuggestionsOptions;
    matches: string[] = [];
    active: number;

    constructor(input: HTMLInputElement | null, options: InputSuggestionsOptions) {
        if (!input) throw new Error('Missing autocomplete input');
        this.input = input;
        this.values = [];
        this.options = options;
        this.active = -1;
        this.list = document.createElement('div');
        this.list.id = `${input.id}-suggestions`;
        this.list.className = styles.list;
        this.list.setAttribute('role', 'listbox');
        this.list.setAttribute('aria-label', options.label);
        this.list.hidden = true;
        document.body.append(this.list);
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-controls', this.list.id);
        input.setAttribute('aria-expanded', 'false');
        input.addEventListener('input', () => this.show(), { signal: this.lifecycle.signal });
        input.addEventListener('focus', () => this.show(), { signal: this.lifecycle.signal });
        input.addEventListener('blur', () => this.hide(), { signal: this.lifecycle.signal });
        input.addEventListener('keydown', event => {
            if (event.isComposing) return;
            if (event.key === 'Escape') { this.hide(); event.preventDefault(); return; }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                if (this.list.hidden) this.show();
                if (!this.matches.length) return;
                this.active = (this.active + (event.key === 'ArrowDown' ? 1 : this.active < 0 ? 0 : -1) + this.matches.length) % this.matches.length;
                this.highlight();
            } else if (event.key === 'Enter' && !this.list.hidden && this.active >= 0) {
                event.preventDefault(); this.choose(this.active);
            }
        }, { signal: this.lifecycle.signal });
        this.list.addEventListener('pointerdown', event => event.preventDefault());
        window.addEventListener('resize', () => this.hide(), { signal: this.lifecycle.signal });
        window.addEventListener('scroll', event => {
            if (!(event.target instanceof Node) || !this.list.contains(event.target)) this.hide();
        }, { capture: true, signal: this.lifecycle.signal });
    }
    /** 入力欄とwindowの購読を解除し、補完一覧を取り除く。 */
    dispose(): void {
        this.lifecycle.abort();
        this.hide();
        this.list.remove();
    }
    /** 表示元を置き換え、開いている一覧だけを更新する。 */
    setValues(values: readonly string[]): void {
        this.values = values;
        if (!this.list.hidden) this.show();
    }
    /** 候補を閉じ、読み上げ用の選択状態を解除する。 */
    hide() {
        this.list.hidden = true;
        this.input.setAttribute('aria-expanded', 'false');
        this.input.removeAttribute('aria-activedescendant');
    }
    /** 入力値に応じた候補を、画面内に収まる位置と幅で表示する。 */
    private show() {
        if (this.input.matches(':disabled')) return;
        const query = this.input.value.trim().toLowerCase();
        this.matches = this.values.filter(value => this.options.filterByInput === false || value.toLowerCase().includes(query)).slice(0, this.options.limit ?? 50);
        this.active = -1;
        this.input.removeAttribute('aria-activedescendant');
        this.list.replaceChildren();
        this.matches.forEach((name, index) => {
            const option = document.createElement('div');
            option.className = styles.option;
            option.id = `${this.list.id}-${index}`;
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            option.textContent = name;
            option.addEventListener('click', () => this.choose(index));
            this.list.append(option);
        });
        if (!this.matches.length) { this.hide(); return; }
        const rect = this.input.getBoundingClientRect();
        const width = Math.min(Math.max(rect.width, 340), window.innerWidth - 24);
        this.list.style.width = `${width}px`;
        this.list.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
        const below = window.innerHeight - rect.bottom - 20;
        const above = rect.top - 20;
        const useAbove = below < 160 && above > below;
        this.list.style.maxHeight = `${Math.max(0, Math.min(280, useAbove ? above : below))}px`;
        this.list.style.top = useAbove ? 'auto' : `${rect.bottom + 8}px`;
        this.list.style.bottom = useAbove ? `${window.innerHeight - rect.top + 8}px` : 'auto';
        this.list.hidden = false;
        this.list.scrollTop = 0;
        this.input.setAttribute('aria-expanded', 'true');
    }
    /** 選択中の候補と読み上げ対象を同期し、スクロール範囲内へ移す。 */
    private highlight() {
        [...this.list.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === this.active)));
        const option = this.list.children[this.active];
        if (!option) return;
        this.input.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({ block: 'nearest' });
    }
    /** 候補を選び、呼び出し元へ通知するか入力イベントで反映する。 */
    private choose(index: number): void {
        const name = this.matches[index];
        if (name === undefined) return;
        if (this.options.onSelect) this.options.onSelect(name);
        else {
            this.input.value = name;
            this.input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        this.hide();
    }
}
