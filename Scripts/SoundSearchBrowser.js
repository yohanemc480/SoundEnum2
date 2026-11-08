import { Text } from './Text.js';
import { SoundSearchResource } from './SoundSearchResource.js';
import { SoundManager } from './Singletons/SoundManager.js';
import { HistoryManager } from './Singletons/HistoryManager.js';
import { MCCommandSound } from './MCCommandSound.js';
import { MCCommandSelector } from './Constants/MCCommandSelector.js';
import { MCRawSound } from './MCRawSound.js';

export class SoundSearchBrowser
{
    constructor(outputArea)
    {
        this.outputArea = outputArea;
        this.resource = new SoundSearchResource();
        this.requestId = 0;
        this.page = 0;
        this.results = [];
        this.candidatePopover = document.createElement('section');
        this.candidatePopover.className = 'sound-candidates-popover';
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
        window.addEventListener('resize', closeCandidates);
        window.addEventListener('scroll', event => {
            if (!this.candidatePopover.contains(event.target)) closeCandidates();
        }, true);
        document.querySelectorAll('[data-browser-tab]').forEach(tab => tab.addEventListener('click', closeCandidates));

        this.element = id => document.getElementById(`search-${id}`);
        this.form = this.element('form');
        this.element('form-container').addEventListener('submit', event => event.preventDefault());
        this.form.addEventListener('input', event => {
            this.filterTags();
            if (event.target === this.element('tag-query')) return;
            ++this.requestId;
            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.search(), 120);
        });
        document.getElementById('search-tab').addEventListener('click', () => this.load());
        this.element('retry').addEventListener('click', () => { this.index = null; this.load(); });
        this.element('clear').addEventListener('click', () => { this.element('form-container').reset(); this.filterTags(); this.search(); });
        this.element('previous').addEventListener('click', () => { this.page--; this.render(); });
        this.element('next').addEventListener('click', () => { this.page++; this.render(); });
    }

    async load()
    {
        if (this.index || this.loading) return;
        this.loading = true;
        ++this.requestId;
        this.element('list').replaceChildren();
        this.element('pagination').hidden = true;
        this.form.disabled = true;
        this.element('retry').hidden = true;
        this.element('status').textContent = Text.searchLoading;
        try {
            const index = await this.resource.load();
            if (index.tags.some(tag => typeof Text[tag.textKey] !== 'string')) throw new Error('Unknown tag label');
            this.index = index;
            const choices = this.element('choices');
            choices.replaceChildren();
            for (const event of index.events) choices.append(new Option(event.name, event.name));
            const tags = this.element('tags');
            tags.replaceChildren();
            for (const tag of index.tags) {
                const label = document.createElement('label');
                label.dataset.tag = tag.id;
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox'; checkbox.value = tag.id;
                label.append(checkbox, document.createTextNode(Text[tag.textKey]));
                tags.append(label);
            }
            this.form.disabled = false;
            this.filterTags();
            await this.search();
        } catch (error) {
            this.index = null;
            this.resource.dispose();
            this.element('status').textContent = error.message === 'missing' ? Text.searchMissing : Text.searchFailure;
            this.element('retry').hidden = false;
            console.error(error);
        } finally { this.loading = false; }
    }

    filterTags()
    {
        if (!this.index) return;
        const query = this.element('tag-query').value.trim().toLowerCase();
        for (const label of this.element('tags').querySelectorAll('label')) {
            const tag = this.index.tags.find(tag => tag.id === label.dataset.tag);
            const keywords = `${Text[tag.textKey]} ${Text[`${tag.textKey}Aliases`] ?? ''} ${tag.id}`.toLowerCase();
            // 選択済みタグは検索語に一致しなくても残し、隠れた絞り込み条件を作らない。
            label.hidden = !label.querySelector('input').checked && !keywords.includes(query);
        }
    }

    async search()
    {
        if (!this.index) return;
        this.candidatePopover.hidePopover();
        const id = ++this.requestId;
        this.element('list').replaceChildren();
        this.element('pagination').hidden = true;
        const min = this.element('min').value === '' ? 0 : this.element('min').valueAsNumber;
        const max = this.element('max').value === '' ? Infinity : this.element('max').valueAsNumber;
        if (!this.element('min').validity.valid || !this.element('max').validity.valid || !Number.isFinite(min) || Number.isNaN(max) || min > max) {
            this.element('status').textContent = Text.searchInvalidRange; return;
        }
        const base = this.element('base').value.trim();
        if (base && !this.index.events.some(event => event.name === base)) {
            this.element('status').textContent = Text.searchInvalidBase; return;
        }
        this.element('status').textContent = Text.searchRunning;
        try {
            const { results } = await this.resource.request({ type: 'search', options: {
                query: this.element('query').value, base, min, max,
                tags: [...this.element('tags').querySelectorAll('input:checked')].map(input => input.value)
            } });
            if (id !== this.requestId) return;
            this.results = results; this.page = 0; this.render();
        } catch (error) {
            if (id !== this.requestId) return;
            this.element('status').textContent = Text.searchFailure;
            this.element('retry').hidden = false;
            console.error(error);
        }
    }

    createTagBadges(tags)
    {
        const badges = document.createElement('span');
        badges.className = 'sound-tag-badges';
        badges.setAttribute('aria-label', Text.searchAssignedTags);
        for (const id of tags) {
            const badge = document.createElement('span');
            badge.className = 'sound-tag-badge';
            badge.textContent = Text[this.index.tags.find(tag => tag.id === id).textKey];
            badges.append(badge);
        }
        if (!tags.length) {
            const empty = document.createElement('span');
            empty.className = 'sound-tag-empty';
            empty.textContent = Text.searchNoTags;
            badges.append(empty);
        }
        return badges;
    }

    render()
    {
        const list = this.element('list');
        this.candidatePopover.hidePopover();
        list.replaceChildren(); list.scrollTop = 0;
        const pages = Math.ceil(this.results.length / 50);
        this.page = Math.max(0, Math.min(this.page, pages - 1));
        this.element('previous').disabled = this.page === 0;
        this.element('next').disabled = this.page >= pages - 1;
        this.element('pagination').hidden = !pages;
        this.element('page').textContent = Text.searchPage(this.page + 1, pages);
        this.element('status').textContent = this.results.length ? Text.searchResults(this.results.length, this.page * 50 + 1, Math.min((this.page + 1) * 50, this.results.length)) : Text.searchEmpty;
        for (const entry of this.results.slice(this.page * 50, (this.page + 1) * 50)) {
            const row = document.createElement('div'); row.className = 'search-row';
            const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'search-preview';
            const name = document.createElement('span'); name.textContent = entry.name;
            const detail = document.createElement('small');
            detail.textContent = [entry.score === null ? '' : Text.searchScore(Math.round(entry.score * 100)),
                entry.sameAudio ? Text.searchSameAudio : ''].filter(Boolean).join(' · ');
            const metadata = document.createElement('span'); metadata.className = 'search-row-metadata';
            if (detail.textContent) metadata.append(detail);
            metadata.append(this.createTagBadges(entry.tags));
            preview.append(name);
            const playCandidate = (candidate, button) => {
                const manager = SoundManager.Instance;
                const command = new MCCommandSound(entry.name, manager.GetSource(), MCCommandSelector.All, manager.GetVolume(), manager.GetPitch(), manager.GetMinVolume());
                manager.Play(command, new MCRawSound(candidate));
                this.outputArea.SetText(command.ToString());
                HistoryManager.Instance.Register(command);
                HistoryManager.Instance.ScrollToBottom();
                list.querySelectorAll('.selected').forEach(element => element.classList.remove('selected'));
                this.candidatePopover.querySelectorAll('.selected').forEach(element => element.classList.remove('selected'));
                button.classList.add('selected');
            };
            preview.addEventListener('click', () => playCandidate(entry.candidate, preview));
            const similar = document.createElement('button'); similar.type = 'button'; similar.textContent = Text.searchSimilar;
            similar.setAttribute('aria-label', Text.searchSimilarTo(entry.name));
            similar.addEventListener('click', () => { this.element('base').value = entry.name; this.search(); });
            const main = document.createElement('div'); main.className = 'search-row-main';
            main.addEventListener('click', event => {
                if (event.target.closest('button')) return;
                preview.click();
            });
            const content = document.createElement('div'); content.className = 'search-row-content';
            const heading = document.createElement('div'); heading.className = 'search-row-heading';
            heading.append(preview);
            content.append(heading, metadata);
            const actions = document.createElement('div'); actions.className = 'search-row-actions';
            actions.append(similar);
            main.append(content, actions); row.append(main);
            if (entry.count > 1) {
                const trigger = document.createElement('button'); trigger.type = 'button';
                trigger.textContent = Text.searchCandidate(entry.count);
                trigger.setAttribute('aria-label', Text.searchCandidateTags(entry.count));
                trigger.title = Text.searchCandidateTags(entry.count);
                trigger.popoverTargetElement = this.candidatePopover;
                trigger.popoverTargetAction = 'show';
                trigger.addEventListener('click', () => {
                    this.candidateAnchor = trigger;
                    const panel = this.candidatePopover;
                    panel.replaceChildren();
                    const heading = document.createElement('div'); heading.className = 'section-heading';
                    const title = document.createElement('h2'); title.textContent = entry.name;
                    const close = document.createElement('button'); close.type = 'button'; close.className = 'settings-button';
                    close.textContent = Text.close;
                    close.popoverTargetElement = panel; close.popoverTargetAction = 'hide';
                    heading.append(title, close); panel.append(heading);
                    const event = this.index.events.find(event => event.name === entry.name);
                    event.candidates.forEach((candidate, i) => {
                        const button = document.createElement('button'); button.type = 'button'; button.className = 'sound-tag-candidate';
                        const label = document.createElement('span');
                        label.textContent = Text.searchCandidateName(i + 1, candidate.name, candidate.pitch);
                        button.setAttribute('aria-label', Text.searchPreviewCandidate(i + 1, candidate.name));
                        button.append(label, this.createTagBadges(this.index.audioTags[candidate.row]));
                        button.addEventListener('click', () => playCandidate(candidate, button));
                        panel.append(button);
                    });
                    // 別の行から開き直した場合も、新しい位置でtoggleイベントを受ける。
                    panel.hidePopover();
                });
                trigger.className = 'search-candidate-trigger';
                heading.append(trigger);
            }
            list.append(row);
        }
    }
}
