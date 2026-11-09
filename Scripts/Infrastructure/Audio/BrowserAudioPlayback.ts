import type { AudioPlayback, AudioPlaybackRequest, AudioPlaybackState } from '../../Contracts/Services/AudioPlayback.ts';
import { MasterVolumeSettings } from '../../Model/Playback/MasterVolumeSettings.ts';

/** 音源取得・Blob URL・HTMLAudioElementを所有し、値の状態だけを外部へ通知する。 */
export class BrowserAudioPlayback implements AudioPlayback {
    private readonly audio: HTMLAudioElement;
    private readonly listeners = new Set<(state: AudioPlaybackState) => void>();
    private readonly removeListeners: (() => void)[] = [];
    private controller?: AbortController;
    private objectUrl: string | null = null;
    private requestVolume = 1;
    private generation = 0;
    private disposed = false;
    private frame: number | null = null;
    private state: AudioPlaybackState = { revision: 0, soundName: '', hash: '', currentTime: 0, duration: 0,
        playing: false, ready: false, loading: false, error: null, masterVolume: MasterVolumeSettings.DefaultMasterVolume };

    constructor(audio = new Audio()) {
        this.audio = audio;
        audio.preservesPitch = false;
        for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended', 'emptied', 'seeking', 'seeked', 'canplay', 'playing', 'waiting', 'error']) {
            const handler = () => {
                if (event === 'waiting') this.state.loading = true;
                if (['canplay', 'playing', 'ended', 'error'].includes(event)) this.state.loading = false;
                if (event === 'error') this.state.error = 'load';
                this.publish();
            };
            audio.addEventListener(event, handler);
            this.removeListeners.push(() => audio.removeEventListener(event, handler));
        }
    }
    /** 状態のコピーを返し、音声要素を呼び出し元へ公開しない。 */
    read(): AudioPlaybackState { return { ...this.state }; }
    /** 最新状態をすぐ通知し、以降の購読を解除する関数を返す。 */
    subscribe(listener: (state: AudioPlaybackState) => void): () => void {
        this.listeners.add(listener); listener(this.read());
        return () => { this.listeners.delete(listener); };
    }
    /** 音源全体を取得してから再生する。切り替え後の古いダウンロードは反映しない。 */
    async play(request: AudioPlaybackRequest): Promise<void> {
        if (this.disposed) return;
        this.releaseSource();
        const generation = ++this.generation;
        const controller = new AbortController(); this.controller = controller;
        this.state = { ...this.state, revision: this.state.revision + 1, soundName: request.soundName, hash: request.hash,
            loading: true, error: null, currentTime: 0, duration: 0, ready: false, playing: false };
        this.requestVolume = request.volume;
        this.publish();
        try {
            const response = await fetch(request.url, { signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            if (controller.signal.aborted || generation !== this.generation || this.disposed) return;
            this.objectUrl = URL.createObjectURL(blob);
            this.audio.src = this.objectUrl;
            this.audio.preservesPitch = false;
            this.audio.playbackRate = request.pitch;
            this.updateVolume();
            await this.resume();
        } catch {
            if (generation === this.generation && !controller.signal.aborted && !this.disposed) {
                this.state.error = 'load'; this.state.loading = false; this.publish();
            }
        }
    }
    /** 選択済み音源を再開する。再開失敗も状態通知で扱う。 */
    async resume(): Promise<void> {
        if (!this.objectUrl || this.disposed) return;
        const generation = this.generation;
        if (this.audio.ended) this.audio.currentTime = 0;
        this.state.error = null;
        try { await this.audio.play(); }
        catch (error) {
            if (generation !== this.generation || this.disposed) return;
            if (!(error instanceof Error) || error.name !== 'AbortError') this.state.error = 'play';
        }
        if (generation === this.generation && !this.disposed) { this.state.loading = false; this.publish(); }
    }
    /** 再生位置を保持して一時停止する。取得中の場合は自動再生を取り消す。 */
    pause(): void {
        ++this.generation; this.controller?.abort();
        this.audio.pause(); this.state.loading = false; this.publish();
    }
    /** 一時停止し、先頭へ戻す。 */
    stop(): void { this.pause(); this.seek(0); }
    /** 有効な再生範囲内へ移動する。一時停止中に自動再生はしない。 */
    seek(seconds: number): void {
        if (this.disposed || !this.state.ready || !Number.isFinite(seconds)) return;
        this.audio.currentTime = Math.min(this.state.duration, Math.max(0, seconds)); this.publish();
    }
    /** マスター音量を更新し、現在の候補音量との積を適用する。 */
    setMasterVolume(value: number): void {
        if (!Number.isFinite(value)) return;
        this.state.masterVolume = Math.min(1, Math.max(0, value)); this.updateVolume(); this.publish();
    }
    /** 候補とコマンド由来の音量にマスター音量を掛け、ブラウザの範囲に収める。 */
    private updateVolume(): void { this.audio.volume = Math.min(1, Math.max(0, this.requestVolume * this.state.masterVolume)); }
    /** 音声要素から値を取り出す。再生中だけ描画周期で時刻を通知する。 */
    private publish(): void {
        if (this.disposed) return;
        const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
        this.state = { ...this.state, duration, currentTime: Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0,
            ready: !!this.objectUrl && duration > 0 && !this.audio.error,
            playing: !!this.objectUrl && !this.audio.paused && !this.audio.ended };
        this.listeners.forEach(listener => listener(this.read()));
        if (this.state.playing && this.frame === null) this.frame = requestAnimationFrame(() => { this.frame = null; this.publish(); });
        if (!this.state.playing && this.frame !== null) { cancelAnimationFrame(this.frame); this.frame = null; }
    }
    /** 前の取得を取り消し、音源とBlob URLを解放する。 */
    private releaseSource(): void {
        this.controller?.abort();
        this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load();
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
    }
    /** 購読と描画予約、音源、通信を解放する。 */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true; ++this.generation;
        if (this.frame !== null) cancelAnimationFrame(this.frame);
        this.removeListeners.forEach(remove => remove());
        this.listeners.clear(); this.releaseSource();
    }
}
