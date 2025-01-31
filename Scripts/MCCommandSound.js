import { MCCommandSoundSource } from "./Constants/MCCommandSoundSource.js";
import { MCCommandSelector } from "./Constants/MCCommandSelector.js";
import { MCPlaysoundCommandParamResource } from "./MCPlaySoundCommandParamResource.js";
import { MCRawSound } from "./MCRawSound.js";

/**
 * playsoundコマンドを打つときに指定する音を表すクラス
 * ambient.crimson_forest.mood
 */
export class MCCommandSound
{
    static MinVolume = 0;
    static DefaultVolume = 1;
    static MinPitch = 0.5;
    static MaxPitch = 2;
    static DefaultPitch = 1;
    static MinMinVolume = 0;
    static MaxMinVolume = 1;
    static DefaultMinVolume = 0;
    _soundName = "";
    _source = MCCommandSoundSource.master;
    _volume = 1;
    _pitch = 1;
    _minVolume = 1;
    _selector = MCCommandSelector.Executer;// いったん定数とする。
    _position = "~ ~ ~";// いったん定数とする。
    _rawSounds = [];

    constructor(soundName, source, selector, volume, pitch, minVolume, position = "~ ~ ~")
    {
        let rawSounds = MCPlaysoundCommandParamResource.GetSoundParameters(soundName);
        for (let i = 0; i < rawSounds.length; i++) {
            this._rawSounds.push(new MCRawSound(rawSounds[i]))
        }
        this._soundName = soundName;
        this._source = source;
        this._selector = selector;
        this._position = position;
        this._volume = volume;
        this._pitch = pitch;
        this._minVolume = minVolume;
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
     * マイクラ内で提供されるように、複数の音のなかからランダムで抽選した音を返す。
     */
    GetRawSoundRandomly()
    {
        var random = Math.floor(Math.random() * this._rawSounds.length);
        return this._rawSounds[random];
    }

    /**
     * コマンド用の文字列に変換する。
     * playsound minecraft:ambient.cave master @p ~ ~ ~ 1 1 1
     */
    ToString()
    {
        return `playsound minecraft:${this._soundName} ${this._source} ${this._selector} ${this._position} ${this._volume} ${this._pitch} ${this._minVolume}`;
    }

    /**
     * 他のコマンドサウンドと同一かを判定する。
     * @param {*} other
     * @returns
     */
    Equals(other)
    {
        return this.ToString() == other.ToString();
    }
}
