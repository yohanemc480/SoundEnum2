import { CompositionModel } from '../Model/Composition/CompositionModel.ts';
import { normalizeComposition } from '../Model/Composition/CompositionData.ts';
import { normalizeCommandSettings } from '../Model/Command/CommandSettings.ts';
import type { CommandSettings } from '../Model/Command/CommandSettings.ts';
import type { SearchSound } from '../Model/Search/SearchTypes.ts';
import { formatSoundCommand } from '../Model/Command/FormatSoundCommand.ts';
import type { SoundCommand } from '../Model/Command/FormatSoundCommand.ts';
import { selectWeightedCandidate } from '../Model/Playback/SelectWeightedCandidate.ts';
import type { CompositionPlayback, CompositionPlaybackRow, CompositionPlaybackState } from '../Contracts/Services/CompositionPlayback.ts';
import type { CompositionStore } from '../Contracts/Services/CompositionStore.ts';
import type { AudioPlayback } from '../Contracts/Services/AudioPlayback.ts';
import type { WaveformSource } from '../Contracts/Services/PlaybackResources.ts';
import type { CompositionView, CompositionWaveformLayer } from '../Contracts/Views/CompositionView.ts';

/** 他画面への操作と通知をAppで接続する。DOMは含めない。 */
export interface CompositionConnections {
    preview(row: SoundCommand): void | Promise<void>;
    similar(name: string): void;
    notify(message: 'added' | 'limit' | 'failure'): void;
}

/** 行編集・保存・再生・波形取得を調整する。DOMと音声APIには依存しない。 */
export class CompositionPresenter {
    readonly model = new CompositionModel();
    private readonly view: CompositionView;
    private readonly store: CompositionStore;
    private readonly playback: CompositionPlayback;
    private readonly previewPlayback: AudioPlayback;
    private readonly settings: CommandSettings;
    private readonly waveforms: WaveformSource;
    private readonly connections: CompositionConnections;
    private readonly cleanup: (() => void)[] = [];
    private waveformRevision = 0;
    private disposed = false;
    private valid = true;
    private writable = true;
    private failed = false;
    private playbackState: CompositionPlaybackState;
    events: Map<string, SearchSound> | null = null;
    private readonly changeListeners = new Set<() => void>();

    constructor(view: CompositionView, store: CompositionStore, playback: CompositionPlayback,
        previewPlayback: AudioPlayback, settings: CommandSettings, waveforms: WaveformSource, connections: CompositionConnections) {
        this.view = view; this.store = store; this.playback = playback; this.previewPlayback = previewPlayback;
        this.settings = settings; this.waveforms = waveforms; this.connections = connections;
        this.playbackState = playback.read();
        try { this.model.replace(store.read()); }
        catch { this.writable = false; connections.notify('failure'); }
        this.cleanup.push(view.bind({
            toggle: () => { if (this.busy) this.stop(); else void this.play(); },
            remove: index => { if (this.save(this.model.withoutRow(index))) this.render(); },
            settings: (index, value) => {
                this.save(this.model.withSettings(index, normalizeCommandSettings(value)));
                const row = this.rows[index]; if (row) view.showSettings(index, row);
            },
            preview: index => { const row = this.rows[index]; if (row) void connections.preview(row); },
            similar: index => { const row = this.rows[index]; if (row) connections.similar(row.name); },
            validity: valid => { this.valid = valid; this.showState(); },
            volume: value => playback.setVolume(value),
        }));
        this.cleanup.push(playback.subscribe(state => this.updatePlayback(state)));
        let wasPlaying = false;
        this.cleanup.push(previewPlayback.subscribe(state => {
            if (state.playing && !wasPlaying) this.stop();
            wasPlaying = state.playing;
        }));
        this.render();
    }
    /** 行または利用可能なサウンドの変更を購読する。 */
    subscribeChanges(listener: () => void): () => void {
        this.changeListeners.add(listener); return () => { this.changeListeners.delete(listener); };
    }
    /** 編集画面と保存一覧の同期を値の変更として通知する。 */
    private notifyChange(): void { this.changeListeners.forEach(listener => listener()); }
    /** 保存一覧との接続用に独立した行のコピーを返す。 */
    get rows(): SoundCommand[] { return this.model.read(); }
    /** 準備中も停止操作を受け付ける。 */
    private get busy(): boolean { return this.playbackState.phase === 'loading' || this.playbackState.phase === 'playing'; }
    setEvents(events: readonly SearchSound[]): void {
        if (this.disposed) return;
        this.events = new Map(events.map(sound => [sound.name, sound])); this.render(); this.notifyChange();
    }
    /** 保存が成功した場合だけModelを確定する。読み込み失敗後の上書きは禁止する。 */
    save(rows: SoundCommand[]): boolean {
        if (this.disposed) return false;
        try {
            if (!this.writable) throw new Error('Composition storage unavailable');
            const validated = normalizeComposition(rows);
            this.store.save(validated); this.model.replace(validated); this.failed = false;
            this.stop(); this.refreshWaveform(); this.showState(); this.notifyChange(); return true;
        } catch { this.connections.notify('failure'); return false; }
    }
    add(name: string): void {
        if (this.disposed) return;
        if (this.rows.length >= CompositionModel.MaxSounds) { this.connections.notify('limit'); return; }
        if (this.save(this.model.withAdded({ name, ...this.settings.read() }))) {
            this.render(); this.view.revealAdded(); this.connections.notify('added');
        }
    }
    /** 行が増減したときだけ一覧を作り直す。設定編集では入力中の要素を保持する。 */
    render(): void {
        if (this.disposed) return;
        this.view.showRows(this.rows.map(command => ({ command, available: !!this.events?.get(command.name)?.candidates.length,
            missing: !!this.events && !this.events.has(command.name) })));
        this.refreshWaveform(); this.showState();
    }
    /** 現在の行から表示用の候補を選ぶ。実際の再生では重み付き抽選を使う。 */
    private refreshWaveform(): void {
        this.loadWaveforms(this.rows.flatMap(row => {
            const candidate = this.events?.get(row.name)?.candidates[0]; return candidate ? [{ ...row, candidate }] : [];
        }));
    }
    /** 波形取得の応答順が逆転しても最新の行だけを表示する。取得失敗は試聴を妨げない。 */
    private loadWaveforms(rows: CompositionPlaybackRow[]): void {
        const revision = ++this.waveformRevision;
        const duration = Math.max(0, ...rows.map(row => row.candidate.duration / row.pitch));
        this.view.showWaveform([], duration);
        void Promise.all(rows.map(async (row, index) => {
            try { return { peaks: await this.waveforms.load(row.candidate.hash), duration: row.candidate.duration / row.pitch,
                volume: row.volume * row.candidate.volume, index }; }
            catch { return null; }
        })).then(layers => {
            if (!this.disposed && revision === this.waveformRevision)
                this.view.showWaveform(layers.filter((layer): layer is CompositionWaveformLayer => layer !== null), duration);
        });
    }
    /** 再生開始時に単音試聴を止め、実測した長さで波形を更新する。 */
    private updatePlayback(state: CompositionPlaybackState): void {
        if (this.disposed) return;
        const previous = this.playbackState.phase; this.playbackState = state;
        if (state.phase === 'playing' && previous !== 'playing') {
            this.previewPlayback.pause(); this.loadWaveforms(state.rows);
        }
        if (state.phase === 'error' && previous !== 'error') { this.failed = true; this.connections.notify('failure'); }
        this.view.showPlayback(state);
        if (previous !== state.phase) this.showState();
    }
    /** 入力・読込・音源の利用可否から操作可能状態を組み立てる。 */
    private showState(): void {
        if (this.disposed) return;
        const rows = this.rows;
        const available = !!this.events && rows.every(row => !!this.events?.get(row.name)?.candidates.length);
        this.view.showState({ count: rows.length, command: rows.map(row => formatSoundCommand(row)).join('\n'), busy: this.busy,
            canPlay: this.valid && available && rows.length > 0,
            loading: this.playbackState.phase === 'loading' || (!this.events && rows.length > 0),
            status: !this.writable || this.failed ? 'failure' : !rows.length ? 'empty' : this.events && !available ? 'unavailable' : 'ready' });
    }
    stop(): void { if (!this.disposed) this.playback.stop(); }
    /** 候補を値として選び、準備と同時再生をサービスへ委譲する。 */
    async play(): Promise<void> {
        if (this.disposed || !this.valid || !this.events || !this.rows.length) return;
        this.failed = false;
        try {
            const rows = this.rows.map(row => {
                const sound = this.events?.get(row.name); if (!sound) throw new Error('Missing sound');
                return { ...row, candidate: selectWeightedCandidate(sound.candidates, value => value.weight ?? 1) };
            });
            await this.playback.play(rows);
        } catch { if (!this.disposed) { this.failed = true; this.showState(); this.connections.notify('failure'); } }
    }
    /** 購読を解除し、波形の遅延応答を無効化する。サービスの破棄はAppが行う。 */
    dispose(): void {
        if (this.disposed) return;
        this.stop(); this.disposed = true; ++this.waveformRevision;
        this.cleanup.forEach(dispose => dispose()); this.changeListeners.clear();
    }
}
