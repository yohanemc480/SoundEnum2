import { revealAddedItem } from './RevealAddedItem.ts';
import { OutputArea } from './OutputArea.js';
import { formatSoundCommand } from './FormatSoundCommand.ts';
import { SelectMasterVolumeArea } from './SelectMasterVolumeArea.js';
import { CompositionWaveform } from './CompositionWaveform.js';
import { mountSoundSettings } from './SoundSettings.js';
import { bindSettingsPopover } from './BindSettingsPopover.ts';
import { Text } from './Text.ts';
import { localStorageStore } from './LocalStorage.ts';
import { LocalStorageSchema } from './LocalStorageSchema.ts';
import { selectWeightedCandidate } from './SelectWeightedCandidate.ts';
import { SharedAudioPaths } from './ResourcePathProvider.ts';
import { SoundManager } from './Singletons/SoundManager.ts';
import { showToast } from './Toast.ts';

export class SoundComposition {
    static MaxSounds = 10;
    constructor({ onPreview, onSimilar }) {
        this.onPreview = onPreview;
        this.onSimilar = onSimilar;
        this.events = null;
        this.rows = [];
        this.nodes = new Set();
        this.generation = 0;
        this.busy = false;
        this.writable = true;
        try { this.rows = localStorageStore.readEntry(LocalStorageSchema.Composition); }
        catch (error) { console.error(error); this.writable = false; showToast(Text.compositionFailure); }
        this.element = id => document.getElementById(`composition-${id}`);
        this.output = new OutputArea('#composition-output');
        this.waveform = new CompositionWaveform(this.element('waveform'), this.element('time'));
        this.volume = SoundManager.Instance.GetMasterVolume();
        new SelectMasterVolumeArea('#composition-volume', { value: this.volume, onChange: value => {
            this.volume = value;
            for (const source of this.nodes) source.previewGain.gain.value = Math.min(1, source.baseVolume * value);
        } });
        this.element('play').addEventListener('click', () => this.busy ? this.stop() : this.play());
        window.addEventListener('pagehide', () => this.stop());
        SoundManager.Instance.GetAudio().addEventListener('play', () => this.stop());
        this.render();
    }
    setEvents(events) {
        this.events = new Map(events.map(event => [event.name, event]));
        this.render();
        this.onChange?.();
    }
    save(rows) {
        try {
            if (!this.writable) throw new Error('Composition storage unavailable');
            localStorageStore.writeEntry(LocalStorageSchema.Composition, rows);
            this.rows = rows;
            this.refreshWaveform();
            this.updateOutput();
            this.onChange?.();
            return true;
        } catch (error) { console.error(error); showToast(Text.compositionFailure); return false; }
    }
    add(name) {
        if (this.rows.length >= SoundComposition.MaxSounds) {
            showToast(Text.compositionLimit(SoundComposition.MaxSounds));
            return;
        }
        const manager = SoundManager.Instance;
        if (this.save([...this.rows, { name, source: manager.GetSource(), volume: manager.GetVolume(), pitch: manager.GetPitch(), minVolume: manager.GetMinVolume() }])) {
            this.stop(); this.render();
            revealAddedItem(this.element('list'));
            showToast(Text.compositionAdded);
        }
    }
    refreshWaveform() {
        this.waveform?.setRows(this.rows.flatMap(row => {
            const candidate = this.events?.get(row.name)?.candidates[0];
            return candidate ? [{ ...row, candidate }] : [];
        }));
    }
    updateOutput() {
        this.output.SetText(this.rows.map(row => formatSoundCommand(row)).join('\n'));
    }
    render() {
        this.updateOutput();
        this.refreshWaveform();
        const list = this.element('list');
        this.disposePopovers?.forEach(dispose => dispose());
        this.disposePopovers = [];
        list.replaceChildren();
        this.element('count').textContent = Text.compositionCount(this.rows.length);
        const unavailable = this.events && this.rows.some(row => !this.events.has(row.name));
        this.element('status').textContent = !this.writable ? Text.compositionFailure : !this.rows.length ? Text.compositionEmpty :
            unavailable ? Text.compositionUnavailable : '';
        this.element('loading').hidden = !!this.events || !this.rows.length;
        this.rows.forEach((row, index) => {
            const item = document.createElement('div'); item.className = 'composition-row';
            const heading = document.createElement('div'); heading.className = 'section-heading';
            const name = document.createElement('button'); name.type = 'button'; name.className = 'composition-name'; name.textContent = row.name; name.title = row.name;
            name.disabled = !this.events?.get(row.name)?.candidates.length;
            name.addEventListener('click', () => this.onPreview(this.rows[index], name));
            item.addEventListener('click', event => {
                if (event.target.closest('button, .settings-popover')) return;
                name.click();
            });
            const similar = document.createElement('button'); similar.type = 'button';
            similar.className = 'settings-button'; similar.textContent = Text.searchSimilar;
            similar.setAttribute('aria-label', Text.searchSimilarTo(row.name));
            similar.disabled = name.disabled;
            similar.addEventListener('click', () => this.onSimilar(row.name));
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'settings-button close-button';
            remove.setAttribute('aria-label', `${Text.compositionRemove}: ${row.name}`);
            remove.addEventListener('click', () => {
                if (this.save(this.rows.filter((_, i) => i !== index))) { this.stop(); this.render(); }
            });
            const settings = document.createElement('button'); settings.type = 'button';
            settings.className = 'settings-button'; settings.textContent = Text.settings;
            settings.setAttribute('aria-label', `${Text.settings}: ${row.name}`);
            const panel = document.createElement('div'); panel.popover = 'auto';
            panel.className = 'settings-popover sound-settings';
            panel.setAttribute('aria-label', `${Text.settings}: ${row.name}`);
            settings.popoverTargetElement = panel;
            const actions = document.createElement('div'); actions.className = 'composition-actions';
            actions.append(similar, settings, remove);
            heading.append(name, actions); item.append(heading);
            this.disposePopovers.push(bindSettingsPopover(settings, panel));
            if (this.events && !this.events.has(row.name)) {
                const note = document.createElement('p'); note.className = 'section-note'; note.textContent = Text.favoritesUnavailable; item.append(note);
            }
            mountSoundSettings(panel, {
                read: () => this.rows[index],
                save: settings => {
                    const rows = this.rows.map((value, i) => i === index ? { ...value, ...settings } : value);
                    if (this.save(rows)) this.stop();
                },
                onInput: () => this.updateButtons(),
            });
            item.append(panel); list.append(item);
        });
        this.updateButtons();
    }
    updateButtons() {
        const invalid = [...this.element('list').querySelectorAll('input')].some(input => !input.validity.valid || !Number.isFinite(input.valueAsNumber));
        const play = this.element('play');
        play.disabled = !this.busy && (invalid || !this.events || !this.rows.length || this.rows.some(row => !this.events.has(row.name)));
        play.classList.toggle('is-playing', this.busy);
        play.setAttribute('aria-label', this.busy ? Text.compositionStop : Text.compositionPlay);
        play.title = this.busy ? Text.compositionStop : Text.compositionPlay;
    }
    stop() {
        this.waveform?.stop();
        ++this.generation;
        this.controller?.abort();
        for (const node of this.nodes) { try { node.stop(); } catch {} node.disconnect(); }
        this.nodes.clear();
        this.busy = false;
        this.element('loading').hidden = true;
        this.updateButtons();
    }
    async play() {
        if (this.element('play').disabled) return;
        this.stop();
        const generation = this.generation;
        this.busy = true; this.updateButtons();
        this.controller = new AbortController();
        const signal = this.controller.signal;
        this.element('status').textContent = '';
        this.element('loading').hidden = false;
        try {
            this.context ??= new AudioContext();
            await this.context.resume();
            if (generation !== this.generation) return;
            const prepared = this.rows.map(row => ({ ...row, candidate: selectWeightedCandidate(this.events.get(row.name).candidates, candidate => candidate.weight ?? 1) }));
            const buffers = new Map();
            // 同一ハッシュは一度だけ読み込む。再生前に全音声の準備を完了する。
            await Promise.all([...new Set(prepared.map(row => row.candidate.hash))].map(async hash => {
                const response = await fetch(SharedAudioPaths.Audio(hash), { signal });
                if (!response.ok) throw new Error(`Audio HTTP ${response.status}`);
                buffers.set(hash, await this.context.decodeAudioData(await response.arrayBuffer()));
            }));
            if (generation !== this.generation) return;
            this.waveform?.setRows(prepared.map(row => ({ ...row, candidate: {
                ...row.candidate, duration: buffers.get(row.candidate.hash).duration / row.candidate.pitch,
            } })));
            SoundManager.Instance.GetAudio().pause();
            const start = this.context.currentTime + .05;
            for (const row of prepared) {
                const source = this.context.createBufferSource();
                const gain = this.context.createGain();
                source.buffer = buffers.get(row.candidate.hash);
                source.playbackRate.value = row.pitch * row.candidate.pitch;
                source.previewGain = gain; source.baseVolume = row.volume * row.candidate.volume;
                gain.gain.value = Math.min(1, source.baseVolume * (this.volume ?? SoundManager.Instance.GetMasterVolume()));
                source.connect(gain); gain.connect(this.context.destination);
                this.nodes.add(source);
                source.onended = () => {
                    source.disconnect(); gain.disconnect(); this.nodes.delete(source);
                    if (generation === this.generation && !this.nodes.size) { this.busy = false; this.updateButtons(); }
                };
                source.start(start);
            }
            this.waveform?.play(this.context, start, Math.max(...prepared.map(row =>
                buffers.get(row.candidate.hash).duration / (row.pitch * row.candidate.pitch))));
            this.element('loading').hidden = true;
        } catch (error) {
            if (generation !== this.generation) return;
            console.error(error); this.stop(); this.element('status').textContent = Text.compositionFailure; showToast(Text.compositionFailure);
        }
    }
}
