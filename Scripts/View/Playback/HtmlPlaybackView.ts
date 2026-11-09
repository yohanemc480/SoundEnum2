import { playing as playingClass } from './Playback.css.ts';
import { Text } from '../../Text.ts';
import { PreviewWaveform } from './PreviewWaveform.ts';
import type { PlaybackActions, PlaybackView } from '../../Contracts/Views/PlaybackView.ts';
import type { AudioPlaybackState } from '../../Contracts/Services/AudioPlayback.ts';

/** 状態の値からプレイヤーを描画する。ドラッグ中のつまみは再生時刻で上書きしない。 */
export class HtmlPlaybackView implements PlaybackView {
    private readonly button: HTMLButtonElement;
    private readonly seek: HTMLInputElement;
    private readonly time: HTMLElement;
    private readonly soundId: HTMLElement;
    private readonly status: HTMLElement;
    private readonly loading: HTMLElement;
    private readonly waveform: PreviewWaveform;
    private readonly lifecycle = new AbortController();
    private actions?: PlaybackActions;
    private state?: AudioPlaybackState;
    private dragging = false;
    constructor() {
        const button = document.querySelector<HTMLButtonElement>('#preview-toggle');
        const seek = document.querySelector<HTMLInputElement>('#preview-seek');
        const canvas = document.querySelector<HTMLCanvasElement>('#preview-waveform');
        const time = document.querySelector<HTMLElement>('#preview-time');
        const soundId = document.querySelector<HTMLElement>('#preview-sound-id');
        const status = document.querySelector<HTMLElement>('#preview-status');
        const loading = document.querySelector<HTMLElement>('#preview-loading');
        if (!button || !seek || !canvas || !time || !soundId || !status || !loading) throw new Error('Missing preview player element');
        this.button = button; this.seek = seek; this.time = time; this.soundId = soundId; this.status = status; this.loading = loading;
        this.waveform = new PreviewWaveform(canvas);
        const options = { signal: this.lifecycle.signal };
        button.addEventListener('click', () => this.actions?.toggle(), options);
        seek.addEventListener('pointerdown', () => { if (!seek.disabled) this.dragging = true; }, options);
        seek.addEventListener('input', () => { this.dragging = true; this.render(); }, options);
        seek.addEventListener('change', () => this.commitSeek(), options);
        window.addEventListener('pointerup', () => this.commitSeek(), options);
        for (const event of ['pointercancel', 'blur']) seek.addEventListener(event, () => { this.dragging = false; this.render(); }, options);
    }
    /** 入力操作を接続し、解除する関数を返す。 */
    bind(actions: PlaybackActions): () => void { this.actions = actions; return () => { this.actions = undefined; }; }
    /** 音の切り替えでは進行中のドラッグも取り消す。 */
    showState(state: AudioPlaybackState): void {
        if (state.revision !== this.state?.revision) this.dragging = false;
        this.state = state; this.render();
    }
    /** 波形の取得結果を描画部品へ渡す。 */
    showWaveform(peaks: Float32Array | null): void { this.waveform.setPeaks(peaks); }
    /** ドラッグを確定し、秒数だけをPresenterへ通知する。 */
    private commitSeek(): void {
        if (!this.dragging) return;
        const position = Number(this.seek.value); this.dragging = false;
        if (!this.seek.disabled) this.actions?.seek(position);
        this.render();
    }
    /** 時刻表示を分・秒に整形する。 */
    private format(seconds: number): string {
        const value = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
        return `${Math.floor(value / 60)}:${(value % 60).toFixed(1).padStart(4, '0')}`;
    }
    /** 状態からボタン・読み込み・時刻を更新し、ドラッグ中の選択位置を優先する。 */
    private render(): void {
        const state = this.state; if (!state) return;
        this.soundId.textContent = state.soundName; this.soundId.title = state.soundName;
        this.button.disabled = !state.ready || state.error === 'load';
        const label = state.playing ? Text.pause : Text.play;
        this.button.classList.toggle(playingClass, state.playing);
        this.button.setAttribute('aria-label', label); this.button.title = label;
        this.seek.disabled = !state.ready;
        this.seek.max = String(state.ready ? state.duration : 0);
        if (!this.dragging) this.seek.value = String(state.ready ? state.currentTime : 0);
        this.time.textContent = `${this.format(this.dragging ? Number(this.seek.value) : state.currentTime)} / ${this.format(state.duration)}`;
        this.seek.setAttribute('aria-valuetext', this.time.textContent);
        this.waveform.setProgress(state.ready ? Number(this.seek.value) / state.duration : 0);
        this.loading.hidden = !state.loading;
        this.status.textContent = state.error === 'load' ? Text.previewLoadFailure : state.error === 'play' ? Text.previewRetry : '';
    }
    /** DOMとwindowへの購読、およびCanvasの監視を解除する。 */
    dispose(): void { this.lifecycle.abort(); this.actions = undefined; this.waveform.dispose(); }
}
