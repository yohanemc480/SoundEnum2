import { Text } from './Text.ts';

/** 基準音入力専用の候補リスト。フォーカスは入力欄に保持する。 */
export class SoundAutocomplete {
    constructor(input) {
        this.input = input;
        this.names = [];
        this.active = -1;
        this.list = document.createElement('div');
        this.list.id = 'search-choices';
        this.list.className = 'sound-autocomplete';
        this.list.setAttribute('role', 'listbox');
        this.list.setAttribute('aria-label', Text.searchBaseSuggestions);
        this.list.hidden = true;
        document.body.append(this.list);
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-controls', this.list.id);
        input.setAttribute('aria-expanded', 'false');
        input.addEventListener('input', () => this.show());
        input.addEventListener('focus', () => this.show());
        input.addEventListener('blur', () => this.hide());
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
        });
        this.list.addEventListener('pointerdown', event => event.preventDefault());
        window.addEventListener('resize', () => this.hide());
        window.addEventListener('scroll', event => {
            if (!this.list.contains(event.target)) this.hide();
        }, true);
    }
    setNames(names) { this.names = names; }
    hide() {
        this.list.hidden = true;
        this.input.setAttribute('aria-expanded', 'false');
        this.input.removeAttribute('aria-activedescendant');
    }
    show() {
        if (this.input.disabled) return;
        const query = this.input.value.trim().toLowerCase();
        this.matches = this.names.filter(name => name.includes(query)).slice(0, 50);
        this.active = -1;
        this.input.removeAttribute('aria-activedescendant');
        this.list.replaceChildren();
        this.matches.forEach((name, index) => {
            const option = document.createElement('div');
            option.id = `sound-suggestion-${index}`;
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
    highlight() {
        [...this.list.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === this.active)));
        const option = this.list.children[this.active];
        this.input.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({ block: 'nearest' });
    }
    choose(index) {
        this.input.value = this.matches[index];
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
        this.hide();
    }
}
