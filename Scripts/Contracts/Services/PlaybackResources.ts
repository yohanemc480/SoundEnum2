import type { SearchCandidate } from '../../Model/Search/SearchTypes.ts';
/** 試聴用の候補。検索固有の再生時間を含まない。 */
export type PlaybackCandidate = Omit<SearchCandidate, 'duration'>;
/** 試聴に必要な候補・音源URLを解決する。 */
export interface PlaybackResources {
    candidates(soundName: string): readonly PlaybackCandidate[];
    audioUrl(hash: string): string;
}
/** 波形のピークを取得する。取得失敗でも音声再生は継続できる。 */
export interface WaveformSource {
    load(hash: string): Promise<Float32Array>;
}
