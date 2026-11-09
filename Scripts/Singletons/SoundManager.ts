import type { SoundSource } from '../Constants/MCCommandSoundSource.ts';
import type { MCRawSound } from '../MCRawSound.ts';
import { localStorageStore } from '../LocalStorage.ts';
import { LocalStorageSchema, normalizeCommandSettings } from '../LocalStorageSchema.ts';
import { MCCommandSoundSource } from "../Constants/MCCommandSoundSource.ts";
import { SettingDefine } from "../Constants/SettingDefine.ts";
import { MCCommandSound } from "../MCCommandSound.ts";
import { ResourceManager } from "./ResourceManager.ts";
import { SingletonBase } from "./SingletonBase.ts";

export class SoundManager extends SingletonBase
{
    declare static Instance: SoundManager;
    _audio: HTMLAudioElement;
    _soundVolume = 1;
    _audioUrl: string | null = null;
    _loadController: AbortController | undefined;
    _masterVolume: number = SettingDefine.DefaultMasterVolume;
    _source: SoundSource = MCCommandSoundSource.Master;
    _pitch = MCCommandSound.DefaultPitch;
    _volume = MCCommandSound.DefaultVolume;
    _minVolume = MCCommandSound.DefaultMinVolume;

    constructor()
    {
        super();
        try {
            const saved = localStorageStore.readEntry(LocalStorageSchema.CommandSettings);
            this._source = saved.source;
            this._volume = saved.volume;
            this._pitch = saved.pitch;
            this._minVolume = saved.minVolume;
        } catch (error) { console.warn('Cannot read command settings', error); }
        this._audio = new Audio();
        this._audio.preservesPitch = false;
    }

    SaveCommandSettings()
    {
        try {
            localStorageStore.writeEntry(LocalStorageSchema.CommandSettings, {
                source: this._source, volume: this._volume, pitch: this._pitch, minVolume: this._minVolume,
            });
        } catch (error) { console.warn('Cannot save command settings', error); }
    }

    GetAudio()
    {
        return this._audio;
    }

    async Play(commandSound: MCCommandSound, selectedRawSound: MCRawSound | null = null): Promise<void>
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
        this._audio.dispatchEvent(new CustomEvent('previewreset', { detail: rawSound.GetHash(soundHashResource) }));
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

    GetMasterVolume() { return this._masterVolume; }

    SetMasterVolume(volume: number): void
    {
        this._masterVolume = volume;
        this._audio.volume = Math.min(1, Math.max(0, volume * this._soundVolume));
    }

    SetPitch(pitch: number): void
    {
        this._pitch = normalizeCommandSettings({ pitch }).pitch;
        this.SaveCommandSettings();
    }

    GetPitch()
    {
        return this._pitch;
    }

    SetSource(source: SoundSource): void
    {
        this._source = normalizeCommandSettings({ source }).source;
        this.SaveCommandSettings();
    }

    GetSource()
    {
        return this._source;
    }

    SetVolume(volume: number): void
    {
        this._volume = normalizeCommandSettings({ volume }).volume;
        this.SaveCommandSettings();
    }

    GetVolume()
    {
        return this._volume;
    }

    SetMinVolume(minVolume: number): void
    {
        this._minVolume = normalizeCommandSettings({ minVolume }).minVolume;
        this.SaveCommandSettings();
    }

    GetMinVolume()
    {
        return this._minVolume;
    }
}
