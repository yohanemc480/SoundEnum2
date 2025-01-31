import { MCCommandSoundSource } from "../Constants/MCCommandSoundSource.js";
import { MCCommandSound } from "../MCCommandSound.js";
import { ResourceManager } from "./ResourceManager.js";
import { SingletonBase } from "./SingletonBase.js";

export class SoundManager extends SingletonBase
{
    static Instance = null;
    _audio = null;
    static DefaultMasterVolume = 0.1;
    static MinMasterVolume = 0;
    static MaxMasterVolume = 1;
    _masterVolume = 0.1;

    _source;
    _pitch;
    _volume;
    _minVolume;

    constructor()
    {
        super();
        this._source = MCCommandSoundSource.Master;
        this._pitch = MCCommandSound.DefaultPitch;
        this._volume = MCCommandSound.DefaultVolume;
        this._minVolume = MCCommandSound.DefaultMinVolume;
    }

    Play(commandSound)
    {
        if (this._audio != null)
        {
            this._audio.pause();
        }

        var soundHashResource = ResourceManager.Instance.GetSoundHashResouce();
        var rawSound = commandSound.GetRawSoundRandomly();
        this._audio = new Audio(rawSound.CreateLink(soundHashResource));
        this._audio.preservesPitch = false;
        this._audio.playbackRate = commandSound.GetPitch() * rawSound.GetPitch();
        this._audio.volume = this._masterVolume * commandSound.GetVolume() * rawSound.GetVolume();
        // メディアの読み込みが完了した時に流さないとエラーが出る。
        this._audio.addEventListener("canplay", () =>
        {
            this._audio.play();
        });
    }

    SetMasterVolume(volume)
    {
        this._masterVolume = volume;
    }

    SetPitch(pitch)
    {
        this._pitch = pitch;
    }

    GetPitch()
    {
        return this._pitch;
    }

    SetSource(source)
    {
        this._source = source;
    }

    GetSource()
    {
        return this._source;
    }

    SetVolume(volume)
    {
        this._volume = volume;
    }

    GetVolume()
    {
        return this._volume;
    }

    SetMinVolume(minVolume)
    {
        this._minVolume = minVolume;
    }

    GetMinVolume()
    {
        return this._minVolume;
    }
}