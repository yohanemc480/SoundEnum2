/** Minecraftのイベント定義。未使用のメタデータも保持する。 */
export interface SoundEntry {
    name: string;
    type?: string;
    pitch?: number;
    volume?: number;
    weight?: number;
    [key: string]: unknown;
}
/** イベント名とsounds.jsonの定義の対応。参照先イベントの展開前の形式を表す。 */
export type SoundEventDefinitions = Record<string, { sounds?: (string | SoundEntry)[] }>;
/** 参照先を展開した再生候補。durationはピッチ補正後の秒数。 */
export interface SearchCandidate {
    name: string;
    hash: string;
    pitch: number;
    volume: number;
    weight: number;
    duration: number;
}
/** イベント名とその再生候補。型引数でベクトル行番号付きの候補にも対応する。 */
export interface SearchSound<T = SearchCandidate> {
    name: string;
    candidates: T[];
}
/** 類似度計算用のベクトル行番号を持つ再生候補。 */
export interface IndexedCandidate extends SearchCandidate {
    vectorRow: number;
}
/** 検証・検索に使う索引。候補のvectorRowはhashesとベクトルの同じ行を指す。 */
export interface SearchIndex {
    schemaVersion: number;
    version: string;
    sample?: boolean;
    dimensions: number;
    hashes: string[];
    audioTags: Record<string, string[]>;
    tags: { id: string; textKey?: string }[];
    events: SearchSound<IndexedCandidate>[];
}
/** 検索条件。省略した条件は絞り込まず、referenceSoundName指定時だけ類似度を計算する。 */
export interface SearchOptions {
    query?: string;
    tags?: string[];
    referenceSoundName?: string;
    /** 基準イベント内の候補番号。nullまたは省略時は全候補を比較する。 */
    referenceCandidateIndex?: number | null;
    excludeMultipleCandidates?: boolean;
}
/** イベント単位の検索結果。candidateは条件に合う代表候補、candidateCountは元の候補数。scoreは全再生候補の類似度の中央値。 */
export interface SearchResult {
    name: string;
    candidate: IndexedCandidate;
    score: number | null;
    sameAudio: boolean;
    tags: string[];
    candidateCount: number;
}

/** ベクトルの行番号を付ける前の検索データ。 */
export interface SearchSourceIndex extends Omit<SearchIndex, 'hashes' | 'dimensions' | 'events'> {
    events: SearchSound[];
    vectorHash?: string;
}
/** タグ定義ファイルの内容。vectorHashで対応するベクトルファイルを照合する。 */
export interface SearchTagData extends Omit<SearchSourceIndex, 'events'> {
    vectorHash: string;
}
