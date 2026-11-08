import { resolveSoundEvents } from './ResolveSoundEvents.js';

/** 保存済みの定義と共通データから検索用候補を組み立てる。 */
export function buildSearchEvents(sounds, hashes, durations)
{
    return Object.entries(resolveSoundEvents(sounds)).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .filter(([, candidates]) => candidates.length)
        .map(([name, candidates]) => ({ name, candidates: candidates.map(c => {
            const hash = hashes[`minecraft/sounds/${c.name}.ogg`];
            const pitch = c.pitch ?? 1;
            const volume = c.volume ?? 1;
            const weight = c.weight ?? 1;
            const duration = durations[hash];
            if (!/^[0-9a-f]{40}$/.test(hash)) throw new Error(`Missing/invalid audio hash: ${name}: ${c.name}`);
            if (!Number.isFinite(duration) || duration < 0) throw new Error(`Missing/invalid audio duration: ${name}: ${hash}`);
            if (!Number.isFinite(pitch) || pitch <= 0 || !Number.isFinite(volume) || volume < 0 ||
                !Number.isFinite(weight) || weight <= 0) throw new Error(`Invalid sound candidate: ${name}`);
            return { name: c.name, hash, pitch, volume, weight, duration: duration / pitch };
        }) }));
}
