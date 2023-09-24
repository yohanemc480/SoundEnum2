import { SoundManager } from "./sound_manager.js";

/**
 * マスター音量調整エリアを表すクラス
 */
class SelectMasterVolumeArea {
  _textHolder;
  _slider;
  constructor(appendTarget) {
    $(document).ready(() => {
      let $textHolder = $("<div>", {
        text: SoundManager.DefaultMasterVolume
      })

      let $slider = $("<input>", {
        type: "range",
        min: SoundManager.MinMasterVolume,
        max: SoundManager.MaxMasterVolume,
        step: "0.01",
        value: SoundManager.DefaultMasterVolume
      }).appendTo(appendTarget);
      $slider.on("input", () => {
        var value = $slider.val();
        this.OnUpdateValue(value);
      });
      $slider.appendTo(appendTarget);
      $textHolder.appendTo(appendTarget);

      this._textHolder = $textHolder;
      this._slider = $slider;
    });
  }
  OnUpdateValue(value) {
    SoundManager.SetMasterVolume(value);
    this._textHolder.text(value);
    this._slider.val(value);
  }
}

export {SelectMasterVolumeArea};