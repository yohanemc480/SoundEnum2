import { SharedAudioPaths } from "./ResourcePathProvider.js";

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
    constructor(soundData)
    {
        this._rawSoundName = soundData["name"];
        let keys = Object.keys(soundData);

        if (keys.includes("volume"))
        {
            this._volume = soundData["volume"];
        }
        if (keys.includes("pitch"))
        {
            this._pitch = soundData["pitch"];
        }
        if (keys.includes("weight"))
        {
            this._weight = soundData["weight"];
        }
    }

    GetHash(soundHashResource)
    {
        return soundHashResource.NameToHash(this._rawSoundName);
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
    CreateLink(soundHashResource) {
        let hash = this.GetHash(soundHashResource);
        return SharedAudioPaths.Audio(hash);
    }
}
