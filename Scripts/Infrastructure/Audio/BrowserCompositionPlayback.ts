import type { CompositionPlayback, CompositionPlaybackRow, CompositionPlaybackState } from '../../Contracts/Services/CompositionPlayback.ts';

/** 音源とゲインを対にして所有し、停止時に両方を切断する。 */
interface PlayingSource { source: AudioBufferSourceNode; gain: GainNode; volume: number }

/** 全音源を取得・デコードして同時再生する。AudioContextはこのクラスだけが所有する。 */
export class BrowserCompositionPlayback implements CompositionPlayback {
    private readonly audioUrl: (hash: string) => string;
    private readonly createContext: () => AudioContext;
    private context?: AudioContext;
    private controller?: AbortController;
    private generation = 0;
    private disposed = false;
    private volume: number;
    private frame: number | null = null;
    private readonly sources = new Set<PlayingSource>();
    private readonly listeners = new Set<(state: CompositionPlaybackState) => void>();
    private state: CompositionPlaybackState = { phase: 'idle', currentTime: 0, duration: 0, rows: [] };

    constructor(audioUrl: (hash: string) => string, volume: number, createContext = () => new AudioContext()) {
        this.audioUrl = audioUrl; this.volume = volume; this.createContext = createContext;
    }
    read(): CompositionPlaybackState { return { ...this.state, rows: this.state.rows.map(row => ({ ...row, candidate: { ...row.candidate } })) }; }
    /** 最新状態を即座に通知し、解除関数を返す。 */
    subscribe(listener: (state: CompositionPlaybackState) => void): () => void {
        this.listeners.add(listener); listener(this.read());
        return () => { this.listeners.delete(listener); };
    }
    /** 同じハッシュは一度だけ取得し、全行を同じAudioContext時刻へ予約する。 */
    async play(rows: CompositionPlaybackRow[]): Promise<void> {
        if (this.disposed) return;
        this.stop();
        if (!rows.length) return;
        const prepared = rows.map(row => ({ ...row, candidate: { ...row.candidate } }));
        const generation = this.generation;
        const controller = new AbortController(); this.controller = controller;
        this.state = { phase: 'loading', currentTime: 0, duration: 0, rows: prepared }; this.publish();
        try {
            const context = this.context ??= this.createContext();
            await context.resume();
            if (generation !== this.generation) return;
            const buffers = new Map<string, AudioBuffer>();
            await Promise.all([...new Set(prepared.map(row => row.candidate.hash))].map(async hash => {
                const response = await fetch(this.audioUrl(hash), { signal: controller.signal });
                if (!response.ok) throw new Error(`Audio HTTP ${response.status}`);
                buffers.set(hash, await context.decodeAudioData(await response.arrayBuffer()));
            }));
            if (generation !== this.generation) return;
            /** 準備が完了した音源だけを後続の予約処理へ渡す。 */
            const getBuffer = (hash: string): AudioBuffer => {
                const buffer = buffers.get(hash);
                if (!buffer) throw new Error(`Missing decoded audio: ${hash}`);
                return buffer;
            };
            const start = context.currentTime + .05;
            const duration = Math.max(...prepared.map(row => getBuffer(row.candidate.hash).duration / (row.pitch * row.candidate.pitch)));
            for (const row of prepared) {
                const entry = { source: context.createBufferSource(), gain: context.createGain(), volume: row.volume * row.candidate.volume };
                this.sources.add(entry);
                entry.source.buffer = getBuffer(row.candidate.hash);
                entry.source.playbackRate.value = row.pitch * row.candidate.pitch;
                entry.gain.gain.value = Math.min(1, entry.volume * this.volume);
                entry.source.connect(entry.gain); entry.gain.connect(context.destination);
                entry.source.onended = () => {
                    this.release(entry);
                    if (generation === this.generation && !this.sources.size) {
                        this.cancelFrame();
                        this.state = { ...this.state, phase: 'idle', currentTime: duration }; this.publish();
                    }
                };
                entry.source.start(start);
            }
            this.state = { phase: 'playing', currentTime: 0, duration, rows: prepared.map(row => ({ ...row,
                candidate: { ...row.candidate, duration: getBuffer(row.candidate.hash).duration / row.candidate.pitch } })) };
            this.publish();
            /** 音声時計の進行を値として通知する。ViewにAudioContextを渡さない。 */
            const tick = () => {
                this.frame = null;
                if (generation !== this.generation || this.disposed || this.state.phase !== 'playing') return;
                this.state.currentTime = Math.min(duration, Math.max(0, context.currentTime - start)); this.publish();
                if (generation === this.generation && this.state.phase === 'playing') this.frame = requestAnimationFrame(tick);
            };
            if (generation === this.generation) this.frame = requestAnimationFrame(tick);
        } catch {
            if (generation !== this.generation) return;
            this.stop(); this.state.phase = 'error'; this.publish();
        }
    }
    /** 進行中の取得・デコード結果を無効にし、予約済みの音も停止する。 */
    stop(): void {
        ++this.generation; this.controller?.abort(); this.cancelFrame();
        for (const entry of this.sources) {
            entry.source.onended = null;
            try { entry.source.stop(); } catch { /* 未開始の音源も切断する。 */ }
            this.release(entry);
        }
        this.state = { phase: 'idle', currentTime: 0, duration: 0, rows: [] }; this.publish();
    }
    setVolume(value: number): void {
        if (!Number.isFinite(value)) return;
        this.volume = Math.min(1, Math.max(0, value));
        for (const entry of this.sources) entry.gain.gain.value = Math.min(1, entry.volume * this.volume);
    }
    /** 音源・ゲインの接続を解放し、管理対象から除く。 */
    private release(entry: PlayingSource): void {
        entry.source.onended = null; entry.source.disconnect(); entry.gain.disconnect(); this.sources.delete(entry);
    }
    /** 時刻通知の予約を解除する。 */
    private cancelFrame(): void { if (this.frame !== null) cancelAnimationFrame(this.frame); this.frame = null; }
    /** 購読先ごとに状態のコピーを渡す。 */
    private publish(): void { if (!this.disposed) this.listeners.forEach(listener => listener(this.read())); }
    /** 破棄後の非同期応答を無効化し、音声コンテキストも閉じる。 */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true; this.listeners.clear(); this.stop();
        void this.context?.close().catch(() => {});
    }
}
