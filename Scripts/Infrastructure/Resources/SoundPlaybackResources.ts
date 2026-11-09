import type { PlaybackResources, PlaybackCandidate } from '../../Contracts/Services/PlaybackResources.ts';
import type { MCPlaysoundCommandParamResource } from '../../MCPlaysoundCommandParamResource.ts';
import type { MCSoundHashResource } from '../../MCSoundHashResource.ts';
import { SharedAudioPaths } from '../../ResourcePathProvider.ts';
import { MCRawSound } from '../../MCRawSound.ts';

/** Appから渡されたリソースで候補とURLを解決する。Singletonを参照しない。 */
export class SoundPlaybackResources implements PlaybackResources {
    private readonly sounds: MCPlaysoundCommandParamResource;
    private readonly hashes: MCSoundHashResource;
    constructor(sounds: MCPlaysoundCommandParamResource, hashes: MCSoundHashResource) { this.sounds = sounds; this.hashes = hashes; }
    /** 再生用候補を返す。時間は検索データ側で管理するため、この窓口では使用しない。 */
    candidates(soundName: string): readonly PlaybackCandidate[] {
        return this.sounds.GetSoundParameters(soundName).map(entry => {
            const raw = new MCRawSound(entry);
            return { name: entry.name, hash: raw.GetHash(this.hashes), pitch: raw.GetPitch(), volume: raw.GetVolume(), weight: raw.GetWeight() };
        });
    }
    /** 検証済み音源ハッシュから静的音声のURLを生成する。 */
    audioUrl(hash: string): string {
        if (!/^[0-9a-f]{40}$/.test(hash)) throw new Error('Invalid audio hash');
        return SharedAudioPaths.Audio(hash);
    }
}
