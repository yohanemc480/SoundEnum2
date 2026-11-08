import { MCCommandSoundSource } from "../Constants/MCCommandSoundSource.js";
import { SettingDefine } from "../Constants/SettingDefine.js";
import { MCCommandSound } from "../MCCommandSound.js";
import { ResourceManager } from "./ResourceManager.js";
import { SingletonBase } from "./SingletonBase.js";

export class SoundManager extends SingletonBase
{
    _audio;
    _soundVolume = 1;
    _audioUrl;
    _loadController;
    _masterVolume = SettingDefine.DefaultMasterVolume;
    _source = MCCommandSoundSource.Master;
    _pitch = MCCommandSound.DefaultPitch;
    _volume = MCCommandSound.DefaultVolume;
    _minVolume = MCCommandSound.DefaultMinVolume;

    constructor()
    {
        super();
        this._audio = new Audio();
        this._audio.preservesPitch = false;
    }

    GetAudio()
    {
        return this._audio;
    }

    async Play(commandSound, selectedRawSound = null)
    {
        this._loadController?.abort();
        const controller = new AbortController();
        this._loadController = controller;
        if (this._audio != null)
        {
            this._audio.pause();
        }

        var soundHashResource = ResourceManager.Instance.GetSoundHashResouce();
        var rawSound = selectedRawSound ?? commandSound.GetRawSoundRandomly();
        this._audio.dataset.soundId = commandSound.GetSoundName();
        this._audio.dispatchEvent(new Event('previewreset'));
        this._audio.removeAttribute('src');
        this._audio.load();
        if (this._audioUrl) URL.revokeObjectURL(this._audioUrl);
        this._audioUrl = null;
        this._audio.dispatchEvent(new Event('loadstart'));
        // 音声全体を保持し、配信サーバーの Range 対応に依存せずシークする。
        try {
            const response = await fetch(rawSound.CreateLink(soundHashResource), { signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            if (controller.signal.aborted) return;
            this._audioUrl = URL.createObjectURL(blob);
            this._audio.src = this._audioUrl;
            this._audio.dispatchEvent(new CustomEvent('previewdata', { detail: blob }));
        } catch (error) {
            if (!controller.signal.aborted) this._audio.dispatchEvent(new Event('previewerror'));
            return;
        }
        this._audio.preservesPitch = false;
        this._audio.playbackRate = commandSound.GetPitch() * rawSound.GetPitch();
        this._soundVolume = commandSound.GetVolume() * rawSound.GetVolume();
        this._audio.volume = Math.min(1, Math.max(0, this._masterVolume * this._soundVolume));
        // 読み込み後に再生する。切り替えや一時停止による中断は無視する。
        this._audio.play().catch(error => {
            if (error.name !== "AbortError") this._audio.dispatchEvent(new Event("previewerror"));
        });
    }

    SetMasterVolume(volume)
    {
        this._masterVolume = volume;
        this._audio.volume = Math.min(1, Math.max(0, volume * this._soundVolume));
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
