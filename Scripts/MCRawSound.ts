import type { SoundEntry } from './Model/Search/SearchTypes.ts';
import type { MCSoundHashResource } from './MCSoundHashResource.ts';
import { SharedAudioPaths } from "./ResourcePathProvider.ts";

/**
 * アセットとして存在しているサウンドを表すクラス。
 */
export class MCRawSound
{
    _volume = 1;
    _pitch = 1;
    _weight = 1;
    _rawSoundName = "";

    /**
     * @param {*} soundData {"name":"entity/player/attack/crit2","pitch":""}みたいな形式
     */
    constructor(soundData: SoundEntry)
    {
        this._rawSoundName = soundData["name"];

        if (soundData.volume !== undefined)
        {
            this._volume = soundData["volume"];
        }
        if (soundData.pitch !== undefined)
        {
            this._pitch = soundData["pitch"];
        }
        if (soundData.weight !== undefined)
        {
            this._weight = soundData["weight"];
        }
    }

    GetHash(soundHashResource: MCSoundHashResource): string
    {
        const hash = soundHashResource.NameToHash(this._rawSoundName);
        if (hash === undefined) throw new Error(`Missing audio hash: ${this._rawSoundName}`);
        return hash;
    }

    GetWeight()
    {
        return this._weight;
    }

    GetPitch()
    {
        return this._pitch;
    }

    GetVolume()
    {
        return this._volume;
    }

    /** サイト内に保存した音声ファイルの参照先を返す。 */
    CreateLink(soundHashResource: MCSoundHashResource): string {
        let hash = this.GetHash(soundHashResource);
        return SharedAudioPaths.Audio(hash);
    }
}
