import { MCCommandSoundSource } from "./sound.js";
import { MCCommandSound } from "./sound.js";

class SoundManager {
    static Instance = null;
    _audio = null;
    static DefaultMasterVolume = 0.1;
    static MinMasterVolume = 0;
    static MaxMasterVolume = 1;
    _masterVolume = 0.1;
    constructor() {
        if (SoundManager.Instance) {
            return SoundManager.Instance;
        }
        SoundManager.Instance = this;
        this._source = MCCommandSoundSource.Master;
        this._pitch = MCCommandSound.DefaultPitch;
        this._volume = MCCommandSound.DefaultVolume;
        this._minVolume = MCCommandSound.DefaultMinVolume;
    }
    static Play(commandSound) {
        if (this._audio != null) {
            this._audio.pause();
        }
        let rawSound = commandSound.GetRawSoundRandomly();
        this._audio = new Audio(rawSound.CreateLink());
        this._audio.preservesPitch = false;
        this._audio.playbackRate = commandSound.GetPitch() * rawSound.GetPitch();
        this._audio.volume = this.Instance._masterVolume * commandSound.GetVolume() * rawSound.GetVolume();
        // メディアの読み込みが完了した時に流さないとエラーが出る。
        this._audio.addEventListener("canplay", () => {
            this._audio.play();
        });
    }
    static SetMasterVolume(volume) {
        this.Instance._masterVolume = volume;
    }
    static SetPitch(pitch) {
        this.Instance._pitch = pitch;
    }
    static GetPitch() {
        return this.Instance._pitch;
    }
    static SetSource(source) {
        this.Instance._source = source;
    }
    static GetSource() {
        return this.Instance._source;
    }
    static SetVolume(volume) {
        this.Instance._volume = volume;
    }
    static GetVolume() {
        return this.Instance._volume;
    }
    static SetMinVolume(minVolume) {
        this.Instance._minVolume = minVolume;
    }
    static GetMinVolume() {
        return this.Instance._minVolume;
    }
}
export { SoundManager };