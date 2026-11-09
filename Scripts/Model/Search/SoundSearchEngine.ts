import type { SearchIndex, SearchOptions, SearchResult } from './SearchTypes.ts';

/** DOMと独立した検索処理。候補音声単位でAND条件を評価する。 */
export function searchSounds(index: SearchIndex, vectors: Float32Array, { query = '', tags = [], referenceSoundName = '', referenceCandidateIndex = null, excludeMultipleCandidates = false }: SearchOptions = {}): SearchResult[]
{
    const baseline = referenceSoundName ? index.events.find(event => event.name === referenceSoundName) : null;
    if (referenceSoundName && !baseline) throw new Error('Unknown base sound');
    if (referenceCandidateIndex !== null && (!baseline || !Number.isInteger(referenceCandidateIndex) ||
        referenceCandidateIndex < 0 || !baseline.candidates[referenceCandidateIndex])) throw new Error('Unknown base candidate');
    const baseCandidates = baseline ? (referenceCandidateIndex === null ? baseline.candidates : [baseline.candidates[referenceCandidateIndex]!]) : [];
    const baseRows = new Set(baseCandidates.map(candidate => candidate.vectorRow));
    const scores = new Map<number, number>();
    // 同じ音源を共有するイベントでは内積を再利用し、基準の全候補中の最大値を使う。
    const scoreRow = (row: number): number => {
        const cached = scores.get(row);
        if (cached !== undefined) return cached;
        let score = -Infinity;
        for (const other of baseRows) {
            let dot = 0;
            for (let d = 0; d < index.dimensions; d++) dot += vectors[row * index.dimensions + d] * vectors[other * index.dimensions + d];
            score = Math.max(score, dot);
        }
        scores.set(row, score);
        return score;
    };
    const result: SearchResult[] = [];
    for (const event of index.events) {
        if (excludeMultipleCandidates && event.candidates.length > 1) continue;
        if (!event.name.includes(query.trim().toLowerCase())) continue;
        // タグANDはイベント全体の和集合ではなく、一つの候補内で成立させる。
        const candidates = event.candidates.filter(c => tags.every(tag => index.audioTags[c.hash].includes(tag)));
        if (!candidates.length) continue;
        let candidate = candidates[0];
        if (baseline) for (const current of candidates) if (scoreRow(current.vectorRow) > scoreRow(candidate.vectorRow)) candidate = current;
        result.push({ name: event.name, candidate, score: baseline ? scoreRow(candidate.vectorRow) : null,
            sameAudio: baseRows.has(candidate.vectorRow), tags: index.audioTags[candidate.hash],
            candidateCount: event.candidates.length });
    }
    return result.sort((a, b) => (baseline ? Number(b.name === referenceSoundName) - Number(a.name === referenceSoundName) || (b.score ?? 0) - (a.score ?? 0) : 0) || a.name.localeCompare(b.name));
}

/** バージョン、ベクトルの正規化、タグと候補の参照整合性を検証し、不正なら例外を投げる。 */
export function validateSearchData(index: SearchIndex, vectors: Float32Array, version: string): void
{
    if (index.schemaVersion !== 3 || index.version !== version || index.sample ||
        !Number.isInteger(index.dimensions) || index.dimensions < 1 || !Array.isArray(index.hashes) ||
        vectors.length !== index.hashes.length * index.dimensions || Object.keys(index.audioTags).length !== index.hashes.length) throw new Error('Invalid search data');
    const tagIds = new Set(index.tags.map(tag => tag.id));
    const names = new Set<string>();
    if (tagIds.size !== index.tags.length || new Set(index.hashes).size !== index.hashes.length) throw new Error('Duplicate data');
    for (let row = 0; row < index.hashes.length; row++) {
        if (!/^[0-9a-f]{40}$/.test(index.hashes[row]) || !Array.isArray(index.audioTags[index.hashes[row]]) ||
            index.audioTags[index.hashes[row]].some(tag => !tagIds.has(tag))) throw new Error('Invalid audio tags');
        let norm = 0;
        for (let d = 0; d < index.dimensions; d++) norm += vectors[row * index.dimensions + d] ** 2;
        if (!Number.isFinite(norm) || Math.abs(norm - 1) > 0.01) throw new Error('Invalid vector');
    }
    for (const event of index.events) {
        if (typeof event.name !== 'string' || names.has(event.name) || !event.candidates.length) throw new Error('Invalid event');
        names.add(event.name);
        for (const c of event.candidates) {
            if (!Number.isInteger(c.vectorRow) || c.vectorRow < 0 || c.vectorRow >= index.hashes.length || c.hash !== index.hashes[c.vectorRow] ||
                typeof c.name !== 'string' || !Number.isFinite(c.duration) || c.duration < 0 ||
                !Number.isFinite(c.pitch) || c.pitch <= 0 || !Number.isFinite(c.volume) || c.volume < 0) throw new Error('Invalid candidate');
        }
    }
}
