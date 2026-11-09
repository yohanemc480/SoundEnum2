import type { SoundCommand } from '../../Model/Command/FormatSoundCommand.ts';
import type { CommandSettingsValue } from '../../Model/Command/CommandSettings.ts';
import type { CompositionPlaybackState } from '../Services/CompositionPlayback.ts';

/** 組み合わせ画面からの操作。要素やブラウザイベントは含めない。 */
export interface CompositionViewActions {
    toggle(): void;
    remove(index: number): void;
    settings(index: number, value: unknown): void;
    preview(index: number): void;
    similar(index: number): void;
    validity(valid: boolean): void;
    volume(value: number): void;
}
/** 一覧に表示する行と現在のバージョンでの利用可否。 */
export interface CompositionDisplayRow { command: SoundCommand; available: boolean; missing: boolean }
/** 表示文言をViewで選択するための画面状態。 */
export interface CompositionDisplayState {
    count: number;
    status: 'ready' | 'empty' | 'unavailable' | 'failure';
    loading: boolean;
    canPlay: boolean;
    busy: boolean;
    command: string;
}
/** 取得済みの波形。Viewは取得方法を知らない。 */
export interface CompositionWaveformLayer { peaks: Float32Array; duration: number; volume: number; index: number }
/** 組み合わせの表示と操作通知の境界。 */
export interface CompositionView {
    bind(actions: CompositionViewActions): () => void;
    showRows(rows: CompositionDisplayRow[]): void;
    showSettings(index: number, settings: CommandSettingsValue): void;
    showState(state: CompositionDisplayState): void;
    showPlayback(state: CompositionPlaybackState): void;
    showWaveform(layers: CompositionWaveformLayer[], duration: number): void;
    revealAdded(): void;
}
