import type { SoundEntry, SoundEvents, SearchTagData } from './SearchTypes.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
}
function isSoundEntry(value: unknown): value is SoundEntry {
    return isRecord(value) && typeof value.name === 'string'
        && (value.type === undefined || typeof value.type === 'string')
        && ['pitch', 'volume', 'weight'].every(key => value[key] === undefined || typeof value[key] === 'number');
}

export function parseSoundEvents(value: unknown): SoundEvents {
    if (!isRecord(value)) throw new Error('Invalid sound events');
    const events: SoundEvents = Object.create(null);
    for (const [name, event] of Object.entries(value)) {
        if (!isRecord(event)) throw new Error('Invalid sound event');
        const sounds: unknown = event.sounds;
        if (sounds === undefined) { events[name] = { ...event }; continue; }
        if (!Array.isArray(sounds) || !sounds.every((sound: unknown) => typeof sound === 'string' || isSoundEntry(sound)))
            throw new Error('Invalid sound entries');
        events[name] = { ...event, sounds };
    }
    return events;
}

export function parseHashMap(value: unknown): Record<string, string> {
    if (!isRecord(value)) throw new Error('Invalid audio hashes');
    const result: Record<string, string> = Object.create(null);
    for (const [name, hash] of Object.entries(value)) {
        if (typeof hash !== 'string' || !/^[0-9a-f]{40}$/.test(hash)) throw new Error('Invalid audio hash');
        result[name] = hash;
    }
    return result;
}

export function parseDurations(value: unknown): Record<string, number> {
    if (!isRecord(value)) throw new Error('Invalid audio durations');
    const result: Record<string, number> = Object.create(null);
    for (const [hash, duration] of Object.entries(value)) {
        if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) throw new Error('Invalid audio duration');
        result[hash] = duration;
    }
    return result;
}

export function parseSearchTags(value: unknown): SearchTagData {
    if (!isRecord(value) || value.schemaVersion !== 3 || typeof value.version !== 'string'
        || typeof value.vectorHash !== 'string' || !/^[0-9a-f]{64}$/.test(value.vectorHash)
        || (value.sample !== undefined && typeof value.sample !== 'boolean')
        || !Array.isArray(value.tags) || !isRecord(value.audioTags)) throw new Error('Invalid search tags');
    const tags = value.tags.map((tag: unknown) => {
        if (!isRecord(tag) || typeof tag.id !== 'string' || typeof tag.textKey !== 'string') throw new Error('Invalid tag');
        return { ...tag, id: tag.id, textKey: tag.textKey };
    });
    const audioTags: Record<string, string[]> = Object.create(null);
    for (const [hash, ids] of Object.entries(value.audioTags)) {
        if (!isStringArray(ids)) throw new Error('Invalid audio tags');
        audioTags[hash] = ids;
    }
    return { ...value, schemaVersion: 3, version: value.version, vectorHash: value.vectorHash,
        sample: value.sample, tags, audioTags };
}
