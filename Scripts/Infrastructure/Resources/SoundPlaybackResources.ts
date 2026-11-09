import type { PlaybackResources, PlaybackCandidate } from '../../Contracts/Services/PlaybackResources.ts';
import type { SoundEntry } from '../../Model/Search/SearchTypes.ts';
import { resolveSoundEventReferences } from '../../Model/Search/ResolveSoundEventReferences.ts';
import { parseSoundEvents, parseHashMap } from './ParseResourceData.ts';
import { SharedAudioPaths } from './ResourcePathProvider.ts';

/** 取得済みのJSONを検証し、試聴用の候補と音声URLを解決する。通信は行わない。 */
export class SoundPlaybackResources implements PlaybackResources {
    private readonly sounds: Record<string, SoundEntry[]>;
    private readonly hashes: Record<string, string>;
    /** 生成時に形式を検証し、イベント参照を展開する。不正データや循環参照は例外で返す。 */
    constructor(soundEvents: unknown, audioHashes: unknown) {
        this.hashes = parseHashMap(audioHashes);
        this.sounds = resolveSoundEventReferences(parseSoundEvents(soundEvents));
    }
    /** 候補を独立した値として返す。不明なイベントやハッシュ欠落は再生前に検出する。 */
    candidates(soundName: string): readonly PlaybackCandidate[] {
        if (!Object.hasOwn(this.sounds, soundName)) throw new Error(`Missing sound event: ${soundName}`);
        return this.sounds[soundName].map(entry => {
            const hash = this.hashes[`minecraft/sounds/${entry.name}.ogg`];
            if (hash === undefined) throw new Error(`Missing audio hash: ${entry.name}`);
            return { name: entry.name, hash, pitch: entry.pitch ?? 1, volume: entry.volume ?? 1, weight: entry.weight ?? 1 };
        });
    }
    /** 検証済み音源ハッシュから静的音声のURLを生成する。 */
    audioUrl(hash: string): string {
        if (!/^[0-9a-f]{40}$/.test(hash)) throw new Error('Invalid audio hash');
        return SharedAudioPaths.Audio(hash);
    }
}
