import { SoundManager } from "./Singletons/SoundManager.js";
import { MCCommandSound } from "./MCCommandSound.js";

/**
 * サウンド音量調整エリアを表すクラス
 */
export class SelectVolumeArea
{
    _textInputHolder;
    _slider;
    constructor(appendTarget)
    {
        $(document).ready(() =>
        {
            const $slider = $("<input>", {
                type: "range",
                min: MCCommandSound.MinVolume,
                max: 1,
                step: "0.1",
                value: SoundManager.Instance.GetVolume()
            }).appendTo(appendTarget);
            $slider.on("input", () => this.OnUpdateValue($slider.val()));

            let $textInputHolder = $("<input>",
            {
                value: SoundManager.Instance.GetVolume()
            }).appendTo(appendTarget);

            $textInputHolder.on("blur", () =>
            {
                var value = $textInputHolder.val();
                this.OnUpdateValue(value);
            });

            this._textInputHolder = $textInputHolder;
            this._slider = $slider;
        });
    }
    OnUpdateValue(value)
    {
        let numericPart = String(value).match(/-?\d+(\.\d+)?/)?.[0];

        if (numericPart == null)
        {
            numericPart = MCCommandSound.DefaultVolume;
        }

        if (numericPart < MCCommandSound.MinVolume)
        {
            numericPart = MCCommandSound.MinVolume;
        }

        var floatValue = parseFloat(numericPart);
        SoundManager.Instance.SetVolume(floatValue);
        this._textInputHolder.val(floatValue);
        this._slider.val(Math.min(floatValue, 1));
    }
}
