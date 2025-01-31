import { SoundManager } from "./Singletons/SoundManager.js";
import { SettingDefine } from "./Constants/SettingDefine.js";

/**
 * マスター音量調整エリアを表すクラス
 */
export class SelectMasterVolumeArea
{
    _textHolder;
    _slider;
    constructor(appendTarget)
    {
        $(document).ready(() =>
        {
            let $textHolder = $("<div>",
            {
                text: SettingDefine.DefaultMasterVolume
            })

            let $slider = $("<input>",
            {
                type: "range",
                min: SettingDefine.MinMasterVolume,
                max: SettingDefine.MaxMasterVolume,
                step: "0.01", 
                value: SettingDefine.DefaultMasterVolume
            }).appendTo(appendTarget);

            $slider.on("input", () =>
            {
                var value = $slider.val();
                this.OnUpdateValue(value);
            });

            $slider.appendTo(appendTarget);
            $textHolder.appendTo(appendTarget);

            this._textHolder = $textHolder;
            this._slider = $slider;
        });
    }

    OnUpdateValue(value)
    {
        SoundManager.Instance.SetMasterVolume(value);
        this._textHolder.text(value);
        this._slider.val(value);
    }
}