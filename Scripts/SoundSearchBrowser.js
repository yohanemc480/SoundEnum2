import { SoundAutocomplete } from './SoundAutocomplete.js';
import { confirmAction } from './ConfirmDialog.ts';
import { readPreferences, savePreferences, restoreSearchPreferences } from './SearchPreferences.ts';
import { showToast } from './Toast.ts';
import { Favorites } from './Favorites.ts';
import { Text } from './Text.ts';
import { SearchWaveforms } from './SearchWaveforms.ts';
import { SoundSearchResource } from './SoundSearchResource.ts';
import { SoundManager } from './Singletons/SoundManager.ts';
import { MCCommandSound } from './MCCommandSound.ts';
import { MCCommandSelector } from './Constants/MCCommandSelector.ts';
import { MCRawSound } from './MCRawSound.ts';

export class SoundSearchBrowser
{
    constructor(outputArea, paths, composition)
    {
        this.outputArea = outputArea;
        this.composition = composition;
        try { this.favorites = new Favorites(); }
        catch (error) { console.error(error); this.favorites = null; }

        this.resource = new SoundSearchResource(paths);
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
        this.autocomplete = new SoundAutocomplete(this.element('base'));
        for (const name of ['query', 'base']) {
            this.element(`clear-${name}`).addEventListener('click', () => {
                const input = this.element(name);
                input.value = '';
                input.focus();
                input.dispatchEvent(new Event('input', { bubbles: true }));
                this.autocomplete.hide();
            });
        }
        this.waveforms = new SearchWaveforms(document.querySelector('.browser-panel'));
        this.element('form-container').addEventListener('submit', event => event.preventDefault());
        this.form.addEventListener('input', () => {
            this.saveSearchPreferences();
            ++this.requestId;
            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.search(), 120);
        });
        this.element('exclude-multiple').addEventListener('change', () => {
            clearTimeout(this.timer);
            this.search();
        });
        document.getElementById('search-tab').addEventListener('click', () => this.load());
        document.getElementById('favorites-tab').addEventListener('click', async () => {
            await this.load();
            this.renderFavorites();
        });
        this.element('retry').addEventListener('click', () => { this.index = null; this.load(); });
        this.element('clear').addEventListener('click', () => { this.element('form-container').reset(); this.search(); });
        this.element('previous').addEventListener('click', () => { this.page--; this.render(); });
        this.element('next').addEventListener('click', () => { this.page++; this.render(); });
    }

    async load()
    {
        if (this.index || this.loading) return;
        this.loading = true;
        ++this.requestId;
        this.waveforms.clear();
        this.element('list').replaceChildren();
        this.element('base-preview').replaceChildren();
        this.element('base-preview').hidden = true;
        this.element('pagination').hidden = true;
        this.form.disabled = true;
        this.element('retry').hidden = true;
        this.element('status').textContent = Text.searchLoading;
        try {
            const index = await this.resource.load();
            if (index.tags.some(tag => typeof Text[tag.textKey] !== 'string')) throw new Error('Unknown tag label');
            this.index = index;
            this.composition.setEvents(index.events);
            this.autocomplete.setNames(index.events.map(event => event.name));
            const tags = this.element('tags');
            tags.replaceChildren();
            for (const tag of index.tags) {
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox'; checkbox.value = tag.id;
                label.append(checkbox, document.createTextNode(Text[tag.textKey]));
                tags.append(label);
            }
            const saved = restoreSearchPreferences(readPreferences(), index);
            this.element('query').value = saved.query;
            this.element('base').value = saved.base;
            this.element('exclude-multiple').checked = saved.excludeMultiple;
            tags.querySelectorAll('input').forEach(input => { input.checked = saved.tags.includes(input.value); });
            this.form.disabled = false;
            await this.search();
            this.renderFavorites();
        } catch (error) {
            this.index = null;
            this.resource.dispose();
            this.element('status').textContent = error.message === 'missing' ? Text.searchMissing : Text.searchFailure;
            this.element('retry').hidden = false;
            console.error(error);
        } finally { this.loading = false; }
    }

    saveSearchPreferences()
    {
        savePreferences({ query: this.element('query').value, base: this.element('base').value.trim(),
            tags: [...this.element('tags').querySelectorAll('input:checked')].map(input => input.value),
            excludeMultiple: this.element('exclude-multiple').checked });
    }

    async search()
    {
        if (!this.index) return;
        this.saveSearchPreferences();
        this.candidatePopover.hidePopover();
        const id = ++this.requestId;
        this.waveforms.clear();
        this.element('list').replaceChildren();
        this.element('base-preview').replaceChildren();
        this.element('base-preview').hidden = true;
        this.element('pagination').hidden = true;
        const base = this.element('base').value.trim();
        if (base && !this.index.events.some(event => event.name === base)) {
            this.element('status').textContent = Text.searchInvalidBase; return;
        }
        this.element('status').textContent = Text.searchRunning;
        try {
            const { results } = await this.resource.request({ type: 'search', options: {
                query: this.element('query').value, base,
                excludeMultiple: this.element('exclude-multiple').checked,
                tags: [...this.element('tags').querySelectorAll('input:checked')].map(input => input.value)
            } });
            if (id !== this.requestId) return;
            this.results = results.filter(entry => entry.name !== base); this.resultBase = base; this.page = 0; this.render();
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
        this.waveforms.clear();
        this.renderFavorites();
        const list = this.element('list');
        this.candidatePopover.hidePopover();
        list.replaceChildren(); list.scrollTop = 0;
        const basePreview = this.element('base-preview');
        basePreview.replaceChildren();
        const baseline = this.index.events.find(event => event.name === this.resultBase);
        basePreview.hidden = !baseline;
        const pages = Math.ceil(this.results.length / 50);
        this.page = Math.max(0, Math.min(this.page, pages - 1));
        this.element('previous').disabled = this.page === 0;
        this.element('next').disabled = this.page >= pages - 1;
        this.element('pagination').hidden = !pages;
        this.element('page').textContent = Text.searchPage(this.page + 1, pages);
        this.element('status').textContent = this.results.length ? Text.searchResults(this.results.length, this.page * 50 + 1, Math.min((this.page + 1) * 50, this.results.length)) : Text.searchEmpty;
        const entries = this.results.slice(this.page * 50, (this.page + 1) * 50);
        if (baseline) {
            const candidate = baseline.candidates[0];
            entries.unshift({ name: baseline.name, candidate, score: null, sameAudio: false,
                tags: this.index.audioTags[candidate.hash], count: baseline.candidates.length });
        }
        for (const entry of entries) {
            this.appendRow(entry, entry.name === this.resultBase ? basePreview : list);
        }
    }

    updateFavoriteButton(button) {
        const saved = this.favorites?.names.has(button.dataset.favorite) ?? false;
        button.textContent = saved ? '★' : '☆';
        button.setAttribute('aria-pressed', String(saved));
        button.title = saved ? Text.favoritesRemove : Text.favoritesAdd;
        button.setAttribute('aria-label', `${button.title}: ${button.dataset.favorite}`);
        button.disabled = !this.favorites;
    }

    renderFavorites() {
        const list = document.getElementById('favorites-list');
        list.querySelectorAll('canvas').forEach(canvas => this.waveforms.unobserve(canvas));
        list.replaceChildren();
        document.getElementById('favorites-status').textContent = !this.favorites ? Text.favoritesFailure :
            !this.index ? Text.searchLoading : this.favorites.names.size ? '' : Text.favoritesEmpty;
        if (!this.index || !this.favorites) return;
        for (const name of this.favorites.names) {
            const event = this.index.events.find(event => event.name === name);
            const candidate = event?.candidates[0];
            this.appendRow({ name, candidate, count: event?.candidates.length ?? 0,
                score: null, sameAudio: false, tags: candidate ? this.index.audioTags[candidate.hash] : [] }, list);
        }
    }

    searchSimilar(name) {
        clearTimeout(this.timer);
        this.element('form-container').reset();
        this.element('base').value = name;
        document.getElementById('search-tab').click();
        this.search();
    }

    previewSound(name, candidate, button, settings = null) {
                this.composition.stop();
                const manager = SoundManager.Instance;
                const command = new MCCommandSound(name, settings?.source ?? manager.GetSource(), MCCommandSelector.All, settings?.volume ?? manager.GetVolume(), settings?.pitch ?? manager.GetPitch(), settings?.minVolume ?? manager.GetMinVolume());
                manager.Play(command, candidate ? new MCRawSound(candidate) : null);
                this.outputArea.SetText(command.ToString());
                document.querySelectorAll('.browser-panel .selected, .composition-row .selected').forEach(element => element.classList.remove('selected'));
                this.candidatePopover.querySelectorAll('.selected').forEach(element => element.classList.remove('selected'));
                button.classList.add('selected');
    }

    appendRow(entry, container) {
            const candidates = this.index.events.find(event => event.name === entry.name)?.candidates ?? [];
            const row = document.createElement('div'); row.className = 'search-row';
            const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'search-preview';
            const name = document.createElement('span'); name.textContent = entry.name;
            const detail = document.createElement('small');
            detail.className = 'search-similarity';
            detail.textContent = [entry.score === null ? '' : Text.searchScore(Math.round(entry.score * 100)),
                entry.sameAudio ? Text.searchSameAudio : ''].filter(Boolean).join(' · ');
            const metadata = document.createElement('span'); metadata.className = 'search-row-metadata';
            if (detail.textContent) metadata.append(detail);
            if (candidates.length) metadata.append(this.createTagBadges(entry.tags));
            else metadata.textContent = Text.favoritesUnavailable;
            preview.append(name);
            preview.disabled = !candidates.length;
            const playCandidate = (candidate, button) => {
                this.previewSound(entry.name, candidate, button);
            };
            preview.addEventListener('click', () => playCandidate(null, preview));
            const similar = document.createElement('button'); similar.type = 'button'; similar.textContent = Text.searchSimilar;
            similar.disabled = !candidates.length;
            similar.setAttribute('aria-label', Text.searchSimilarTo(entry.name));
            similar.addEventListener('click', () => {
                this.searchSimilar(entry.name);
            });
            const main = document.createElement('div'); main.className = 'search-row-main';
            main.classList.toggle('search-row-base', entry.name === this.resultBase && !document.getElementById('favorites-panel').contains(container));
            main.addEventListener('click', event => {
                if (event.target.closest('button')) return;
                preview.click();
            });
            const content = document.createElement('div'); content.className = 'search-row-content';
            const heading = document.createElement('div'); heading.className = 'search-row-heading';
            heading.append(preview);
            content.append(heading, metadata);
            const actions = document.createElement('div'); actions.className = 'search-row-actions';
            const favorite = document.createElement('button'); favorite.type = 'button';
            favorite.dataset.favorite = entry.name;
            this.updateFavoriteButton(favorite);
            favorite.addEventListener('click', async () => {
                if (this.favorites.names.has(entry.name) && !await confirmAction(Text.favoritesRemoveConfirm(entry.name), { acceptLabel: Text.confirmRemove })) return;
                try {
                    this.favorites.toggle(entry.name);
                    document.querySelectorAll('[data-favorite]').forEach(button => this.updateFavoriteButton(button));
                    this.renderFavorites();
                } catch (error) { console.error(error); showToast(Text.favoritesFailure); }
            });
            const add = document.createElement('button'); add.type = 'button'; add.textContent = '+';
            add.className = 'composition-add'; add.title = Text.compositionAdd;
            add.setAttribute('aria-label', `${Text.compositionAdd}: ${entry.name}`);
            add.disabled = !candidates.length;
            add.addEventListener('click', () => this.composition.add(entry.name));
            actions.append(favorite, add, similar);
            const waveform = document.createElement('canvas');
            waveform.className = 'search-row-waveform';
            waveform.setAttribute('aria-hidden', 'true');
            main.append(content, waveform, actions); row.append(main);
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
                    const close = document.createElement('button'); close.type = 'button'; close.className = 'settings-button close-button';
                    close.setAttribute('aria-label', Text.close);
                    close.popoverTargetElement = panel; close.popoverTargetAction = 'hide';
                    heading.append(title, close); panel.append(heading);
                    const event = this.index.events.find(event => event.name === entry.name);
                    event.candidates.forEach((candidate, i) => {
                        const button = document.createElement('button'); button.type = 'button'; button.className = 'sound-tag-candidate';
                        const label = document.createElement('span');
                        label.textContent = Text.searchCandidateName(i + 1, candidate.name, candidate.pitch);
                        button.setAttribute('aria-label', Text.searchPreviewCandidate(i + 1, candidate.name));
                        button.append(label, this.createTagBadges(this.index.audioTags[candidate.hash]));
                        button.addEventListener('click', () => playCandidate(candidate, button));
                        panel.append(button);
                    });
                    // 別の行から開き直した場合も、新しい位置でtoggleイベントを受ける。
                    panel.hidePopover();
                });
                trigger.className = 'search-candidate-trigger';
                heading.append(trigger);
            }
            container.append(row);
            if (entry.candidate) this.waveforms.observe(waveform, candidates.map(candidate => candidate.hash), entry.candidate.hash);
    }
}
