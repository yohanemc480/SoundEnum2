/** DOMと独立した検索処理。候補音声単位でAND条件を評価する。 */
export function searchSounds(index, vectors, { query = '', tags = [], base = '', excludeMultiple = false } = {})
{
    const baseline = base ? index.events.find(event => event.name === base) : null;
    if (base && !baseline) throw new Error('Unknown base sound');
    const baseRows = new Set(baseline?.candidates.map(candidate => candidate.row) ?? []);
    const scores = new Map();
    const scoreRow = row => {
        if (scores.has(row)) return scores.get(row);
        let score = -Infinity;
        for (const other of baseRows) {
            let dot = 0;
            for (let d = 0; d < index.dimensions; d++) dot += vectors[row * index.dimensions + d] * vectors[other * index.dimensions + d];
            score = Math.max(score, dot);
        }
        scores.set(row, score);
        return score;
    };
    const result = [];
    for (const event of index.events) {
        if (excludeMultiple && event.candidates.length > 1) continue;
        if (!event.name.includes(query.trim().toLowerCase())) continue;
        const candidates = event.candidates.filter(c => tags.every(tag => index.audioTags[c.hash].includes(tag)));
        if (!candidates.length) continue;
        let candidate = candidates[0];
        if (baseline) for (const current of candidates) if (scoreRow(current.row) > scoreRow(candidate.row)) candidate = current;
        result.push({ name: event.name, candidate, score: baseline ? scoreRow(candidate.row) : null,
            sameAudio: baseRows.has(candidate.row), tags: index.audioTags[candidate.hash],
            count: event.candidates.length });
    }
    return result.sort((a, b) => (baseline ? Number(b.name === base) - Number(a.name === base) || b.score - a.score : 0) || a.name.localeCompare(b.name));
}

export function validateSearchData(index, vectors, version)
{
    if (index.schemaVersion !== 3 || index.version !== version || index.sample ||
        !Number.isInteger(index.dimensions) || index.dimensions < 1 || !Array.isArray(index.hashes) ||
        vectors.length !== index.hashes.length * index.dimensions || Object.keys(index.audioTags).length !== index.hashes.length) throw new Error('Invalid search data');
    const tagIds = new Set(index.tags.map(tag => tag.id));
    const names = new Set();
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
            if (!Number.isInteger(c.row) || c.row < 0 || c.row >= index.hashes.length || c.hash !== index.hashes[c.row] ||
                typeof c.name !== 'string' || !Number.isFinite(c.duration) || c.duration < 0 ||
                !Number.isFinite(c.pitch) || c.pitch <= 0 || !Number.isFinite(c.volume) || c.volume < 0) throw new Error('Invalid candidate');
        }
    }
}
