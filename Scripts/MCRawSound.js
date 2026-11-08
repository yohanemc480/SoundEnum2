import { SoundResourcePaths } from "./Constants/SoundResourcePaths.js";

/**
 * アセットとして存在しているサウンドを表すクラス。
 */
export class MCRawSound
{
    _volume = 1;
    _pitch = 1;
    _weight = 1;
    _soundLink = "";//サーバーから直接音源を DLできるリンク
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
            this.weight = soundData["weight"];
        }
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
        let hash = soundHashResource.NameToHash(this._rawSoundName);
        return SoundResourcePaths.Audio(hash);
    }
}
