import { isBrowserTab } from '../Navigation/BrowserTab.ts';
import type { BrowserTab } from '../Navigation/BrowserTab.ts';
import type { SearchOptions } from "./SearchTypes.ts";

/** 検索条件と選択中のバージョン・タブ。保存済みのフィールド名を維持する。 */
export interface SearchPreferencesValue {
    version: string;
    query: string;
    queryHistory?: string[];
    base: string;
    referenceCandidateIndex?: number | null;
    tags: string[];
    excludeMultiple: boolean;
    excludedVersion?: string;
    tab: BrowserTab;
}



/** 検証対象がオブジェクトか判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}
/** 不正なフィールドを既定値に戻し、配列は複製する。 */
export function normalizePreferences(input: unknown = {}): SearchPreferencesValue {
    const value = isRecord(input) ? input : {};
    return {
        version: typeof value.version === 'string' ? value.version : '',
        query: typeof value.query === 'string' ? value.query : '',
        ...(Array.isArray(value.queryHistory) ? { queryHistory: [...new Set(value.queryHistory.filter((query): query is string => typeof query === 'string').map(query => query.trim()).filter(Boolean))].slice(0, 7) } : {}),
        ...(Number.isInteger(value.referenceCandidateIndex) && Number(value.referenceCandidateIndex) >= 0 ? { referenceCandidateIndex: Number(value.referenceCandidateIndex) } : {}),
        base: typeof value.base === 'string' ? value.base : '',
        tags: Array.isArray(value.tags) ? [...new Set(value.tags.filter(tag => typeof tag === 'string'))] : [],
        excludeMultiple: value.excludeMultiple === true,
        ...(typeof value.excludedVersion === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value.excludedVersion)
            ? { excludedVersion: value.excludedVersion } : {}),
        tab: isBrowserTab(value.tab) ? value.tab : 'search-tab',
    };
}

/** 保存形式の名前を検索条件へ変換する。 */
export function toSearchOptions(saved: SearchPreferencesValue): Required<SearchOptions> {
    return { query: saved.query, tags: [...saved.tags], referenceSoundName: saved.base, referenceCandidateIndex: saved.referenceCandidateIndex ?? null, excludeMultipleCandidates: saved.excludeMultiple, excludedVersion: saved.excludedVersion ?? '' };
}
/** 検索条件だけを保存用のフィールドへ変換する。 */
export function toStoredSearchOptions(options: Required<SearchOptions>): Partial<SearchPreferencesValue> {
    return { query: options.query, tags: [...options.tags], base: options.referenceSoundName, referenceCandidateIndex: options.referenceCandidateIndex ?? null, excludeMultiple: options.excludeMultipleCandidates, excludedVersion: options.excludedVersion || undefined };
}
/** 現在使えない基準サウンド・タグ・除外バージョンを解除し、残りの条件を維持する。 */
export function restoreSearchOptions(saved: Required<SearchOptions>, index: { availableVersions?: readonly string[]; events: readonly { name: string; candidates?: readonly unknown[] }[]; tags: readonly { id: string }[] }): Required<SearchOptions> {
    const sound = index.events.find(sound => sound.name === saved.referenceSoundName);
    const candidateIndex = saved.referenceCandidateIndex;
    const validCandidate = candidateIndex != null && Number.isInteger(candidateIndex) && candidateIndex >= 0 && !!sound?.candidates?.[candidateIndex];
    // 消失した候補を全候補検索へ広げず、基準自体を解除する。
    const validReference = !!sound && (candidateIndex == null || validCandidate);
    return { ...saved, excludedVersion: index.availableVersions && !index.availableVersions.includes(saved.excludedVersion) ? '' : (saved.excludedVersion ?? ''), referenceCandidateIndex: validCandidate ? candidateIndex : null, tags: saved.tags.filter(id => index.tags.some(tag => tag.id === id)),
        referenceSoundName: validReference ? saved.referenceSoundName : '' };
}
