import type { SoundEntry, SoundEvents } from './SearchTypes.ts';

/** event参照を再帰的に展開し、参照元と参照先の再生設定を合成する。 */
export function resolveSoundEvents(events: SoundEvents): Record<string, SoundEntry[]>
{
    const result: Record<string, SoundEntry[]> = Object.create(null);
    const resolve = (name: string, stack = new Set<string>()): SoundEntry[] => {
        if (stack.has(name)) throw new Error(`Circular sound event: ${name}`);
        if (Object.hasOwn(result, name)) return result[name];
        if (!Object.hasOwn(events, name)) throw new Error(`Missing sound event: ${name}`);
        const next = new Set([...stack, name]);
        result[name] = (events[name].sounds ?? []).flatMap(value => {
            const entry: SoundEntry = typeof value === 'string' ? { name: value } : { ...value };
            entry.name = entry.name.replace(/^minecraft:/, '');
            if (entry.type !== 'event') return [entry];
            return resolve(entry.name, next).map(child => ({ ...entry, ...child,
                type: 'sound', name: child.name,
                pitch: (entry.pitch ?? 1) * (child.pitch ?? 1),
                volume: (entry.volume ?? 1) * (child.volume ?? 1),
                weight: (entry.weight ?? 1) * (child.weight ?? 1)
            }));
        });
        return result[name];
    };
    for (const name of Object.keys(events)) resolve(name);
    return result;
}
