import type { AudioPlaybackState } from '../Services/AudioPlayback.ts';
/** プレイヤーから通知する値だけの操作。 */
export interface PlaybackActions {
    toggle(): void;
    seek(seconds: number): void;
}
/** 再生状態と波形を表示する窓口。時間スライダーのドラッグはViewが管理する。 */
export interface PlaybackView {
    bind(actions: PlaybackActions): () => void;
    showState(state: AudioPlaybackState): void;
    showWaveform(peaks: Float32Array | null): void;
}
