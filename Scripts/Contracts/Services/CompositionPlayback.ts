import type { SoundCommand } from '../../Model/Command/FormatSoundCommand.ts';
import type { SearchCandidate } from '../../Model/Search/SearchTypes.ts';

/** 重みに従って候補を選択済みの同時再生行。 */
export interface CompositionPlaybackRow extends SoundCommand { candidate: SearchCandidate }

/** 音声APIを公開せず、進行と実測した長さを値で通知する。 */
export interface CompositionPlaybackState {
    phase: 'idle' | 'loading' | 'playing' | 'error';
    currentTime: number;
    duration: number;
    rows: CompositionPlaybackRow[];
}

/** 複数音源を準備して同じ時刻に再生するサービス。 */
export interface CompositionPlayback {
    read(): CompositionPlaybackState;
    subscribe(listener: (state: CompositionPlaybackState) => void): () => void;
    play(rows: CompositionPlaybackRow[]): Promise<void>;
    stop(): void;
    setVolume(value: number): void;
    dispose(): void;
}
