import type { SoundCommand } from './FormatSoundCommand.ts';
import type { SearchEvent } from './SearchTypes.ts';
import { revealAddedItem } from './RevealAddedItem.ts';
import { OutputArea } from './OutputArea.ts';
import { formatSoundCommand } from './FormatSoundCommand.ts';
import { SelectMasterVolumeArea } from './SelectMasterVolumeArea.ts';
import { CompositionWaveform } from './CompositionWaveform.ts';
import { mountSoundSettings } from './SoundSettings.ts';
import { bindSettingsPopover } from './BindSettingsPopover.ts';
import { Text } from './Text.ts';
import { localStorageStore } from './LocalStorage.ts';
import { LocalStorageSchema } from './LocalStorageSchema.ts';
import { selectWeightedCandidate } from './SelectWeightedCandidate.ts';
import { SharedAudioPaths } from './ResourcePathProvider.ts';
import { SoundManager } from './Singletons/SoundManager.ts';
import { showToast } from './Toast.ts';

interface CompositionOptions {
    onPreview: (row: SoundCommand, button: HTMLButtonElement) => void | Promise<void>;
    onSimilar: (name: string) => void;
}
interface CompositionElements {
    waveform: HTMLCanvasElement;
    play: HTMLButtonElement;
    time: HTMLElement;
    list: HTMLElement;
    count: HTMLElement;
    status: HTMLElement;
    loading: HTMLElement;
}
type PreviewSource = AudioBufferSourceNode & { previewGain: GainNode; baseVolume: number };

export class SoundComposition {
    readonly onPreview: CompositionOptions['onPreview'];
    readonly onSimilar: CompositionOptions['onSimilar'];
    onChange?: () => void;
    events: Map<string, SearchEvent> | null;
    rows: SoundCommand[];
    nodes: Set<PreviewSource>;
    generation: number;
    busy: boolean;
    writable: boolean;
    readonly output: OutputArea;
    readonly waveform: CompositionWaveform;
    volume: number;
    disposePopovers: (() => void)[] = [];
    controller?: AbortController;
    context?: AudioContext;

    element<K extends keyof CompositionElements>(id: K): CompositionElements[K] {
        const element = document.getElementById(`composition-${id}`);
        const expectedType = id === 'waveform' ? HTMLCanvasElement : id === 'play' ? HTMLButtonElement : HTMLElement;
        if (!(element instanceof expectedType)) throw new Error(`Missing/invalid composition element: ${id}`);
        // 上の要素種別検証を、キーごとの戻り値型へ反映する。
        return element as CompositionElements[K];
    }
    static MaxSounds = 10;
    constructor({ onPreview, onSimilar }: CompositionOptions) {
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
    setEvents(events: readonly SearchEvent[]): void {
        this.events = new Map(events.map(event => [event.name, event]));
        this.render();
        this.onChange?.();
    }
    save(rows: SoundCommand[]): boolean {
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
    add(name: string): void {
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
        const unavailable = this.events && this.rows.some(row => !this.events?.has(row.name));
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
                if (event.target instanceof Element && event.target.closest('button, .settings-popover')) return;
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
            if (this.events && !this.events?.has(row.name)) {
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
        play.disabled = !this.busy && (invalid || !this.events || !this.rows.length || this.rows.some(row => !this.events?.has(row.name)));
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
    async play(): Promise<void> {
        if (this.element('play').disabled) return;
        this.stop();
        const generation = this.generation;
        this.busy = true; this.updateButtons();
        this.controller = new AbortController();
        const signal = this.controller.signal;
        this.element('status').textContent = '';
        this.element('loading').hidden = false;
        try {
            const context = this.context ??= new AudioContext();
            await context.resume();
            if (generation !== this.generation) return;
            const events = this.events;
            if (!events) throw new Error('Composition events unavailable');
            const prepared = this.rows.map(row => {
                const event = events.get(row.name);
                if (!event) throw new Error(`Missing sound event: ${row.name}`);
                return { ...row, candidate: selectWeightedCandidate(event.candidates, candidate => candidate.weight ?? 1) };
            });
            const buffers = new Map<string, AudioBuffer>();
            const getBuffer = (hash: string): AudioBuffer => {
                const buffer = buffers.get(hash);
                if (!buffer) throw new Error(`Missing decoded audio: ${hash}`);
                return buffer;
            };
            // 同一ハッシュは一度だけ読み込む。再生前に全音声の準備を完了する。
            await Promise.all([...new Set(prepared.map(row => row.candidate.hash))].map(async hash => {
                const response = await fetch(SharedAudioPaths.Audio(hash), { signal });
                if (!response.ok) throw new Error(`Audio HTTP ${response.status}`);
                buffers.set(hash, await context.decodeAudioData(await response.arrayBuffer()));
            }));
            if (generation !== this.generation) return;
            this.waveform?.setRows(prepared.map(row => ({ ...row, candidate: {
                ...row.candidate, duration: getBuffer(row.candidate.hash).duration / row.candidate.pitch,
            } })));
            SoundManager.Instance.GetAudio().pause();
            const start = context.currentTime + .05;
            for (const row of prepared) {
                const gain = context.createGain();
                const source = Object.assign(context.createBufferSource(), {
                    previewGain: gain, baseVolume: row.volume * row.candidate.volume,
                });
                source.buffer = getBuffer(row.candidate.hash);
                source.playbackRate.value = row.pitch * row.candidate.pitch;
                gain.gain.value = Math.min(1, source.baseVolume * (this.volume ?? SoundManager.Instance.GetMasterVolume()));
                source.connect(gain); gain.connect(context.destination);
                this.nodes.add(source);
                source.onended = () => {
                    source.disconnect(); gain.disconnect(); this.nodes.delete(source);
                    if (generation === this.generation && !this.nodes.size) { this.busy = false; this.updateButtons(); }
                };
                source.start(start);
            }
            this.waveform?.play(context, start, Math.max(...prepared.map(row =>
                getBuffer(row.candidate.hash).duration / (row.pitch * row.candidate.pitch))));
            this.element('loading').hidden = true;
        } catch (error) {
            if (generation !== this.generation) return;
            console.error(error); this.stop(); this.element('status').textContent = Text.compositionFailure; showToast(Text.compositionFailure);
        }
    }
}
