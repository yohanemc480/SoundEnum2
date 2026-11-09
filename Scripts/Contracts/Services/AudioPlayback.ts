/** 再生サービスに渡す音源と倍率。URL解決は呼び出し前に行う。 */
export interface AudioPlaybackRequest {
    soundName: string;
    /** 候補一覧と対応する1始まりの番号。未指定なら表示しない。 */
    candidateNumber?: number;
    hash: string;
    url: string;
    pitch: number;
    volume: number;
}
/** ブラウザAPIを含まない再生状態。revisionは同じ音を再選択した場合も増える。 */
export interface AudioPlaybackState {
    revision: number;
    soundName: string;
    /** 候補一覧と対応する1始まりの番号。未指定なら表示しない。 */
    candidateNumber?: number;
    hash: string;
    currentTime: number;
    duration: number;
    playing: boolean;
    ready: boolean;
    loading: boolean;
    error: 'load' | 'play' | null;
    masterVolume: number;
}
/** 音声要素を公開せずに再生操作と状態の購読を提供する。 */
export interface AudioPlayback {
    read(): AudioPlaybackState;
    subscribe(listener: (state: AudioPlaybackState) => void): () => void;
    play(request: AudioPlaybackRequest): Promise<void>;
    resume(): Promise<void>;
    pause(): void;
    stop(): void;
    seek(seconds: number): void;
    setMasterVolume(value: number): void;
    dispose(): void;
}
