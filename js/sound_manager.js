class SoundManager {
  static Instance = null;
  _audio = null;
  constructor() {
    if (SoundManager.Instance) {
      return SoundManager.Instance;
    }
    SoundManager.Instance = this;
    this._pitch = 2;
    this._volume = 3;
    this._minVolume = 4;
  }
  static Play(commandSound) {
    if (this._audio != null) {
      this._audio.pause();
    }
    let rawSound = commandSound.GetRawSoundRandomly();
    this._audio = new Audio(rawSound.CreateLink());
    this._audio.playbackRate = commandSound.GetPitch() * rawSound.GetPitch();
    // メディアの読み込みが完了した時に流さないとエラーが出る。
    this._audio.addEventListener("canplay",() => {
      this._audio.play();
    });
  }
  static SetPitch(pitch) {
    this._pitch = pitch;
  }
  static GetPitch() {
    return this.Instance._pitch;
  }
  static GetVolume() {
    return this.Instance._volume;
  }
  static GetMinVolume() {
    return this.Instance._minVolume;
  }
}
export {SoundManager};