/** Minecraftのイベント定義。未使用のメタデータも保持する。 */
export interface SoundEntry {
    name: string;
    type?: string;
    pitch?: number;
    volume?: number;
    weight?: number;
    [key: string]: unknown;
}
export type SoundEvents = Record<string, { sounds?: (string | SoundEntry)[] }>;
export interface SearchCandidate {
    name: string;
    hash: string;
    pitch: number;
    volume: number;
    weight: number;
    duration: number;
}
export interface SearchEvent<T = SearchCandidate> {
    name: string;
    candidates: T[];
}
export interface IndexedCandidate extends SearchCandidate {
    row: number;
}
export interface SearchIndex {
    schemaVersion: number;
    version: string;
    sample?: boolean;
    dimensions: number;
    hashes: string[];
    audioTags: Record<string, string[]>;
    tags: { id: string; textKey?: string }[];
    events: SearchEvent<IndexedCandidate>[];
}
export interface SearchOptions {
    query?: string;
    tags?: string[];
    base?: string;
    excludeMultiple?: boolean;
}
export interface SearchResult {
    name: string;
    candidate: IndexedCandidate;
    score: number | null;
    sameAudio: boolean;
    tags: string[];
    count: number;
}
