import { MCSoundHashResource } from "./MCSoundHashResource.js";

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

    /**
     * リソースサーバーへのリンクを生成する。
     * @returns https://resources.download.minecraft.net/1f/1feb74db490a786a656387fc2ac8d682730228e2みたいな形式
     */
    CreateLink() {
        let hash = MCSoundHashResource.Instance.NameToHash(this._rawSoundName);
        return `https://resources.download.minecraft.net/${hash.slice(0, 2)}/${hash}`;
    }
}
