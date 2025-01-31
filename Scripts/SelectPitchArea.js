import { SoundManager } from "./SoundManager.js";
import { MCCommandSound } from "./MCCommandSound.js";

/**
 * ピッチ調整エリアを表すクラス
 */
export class SelectPitchArea
{
    _textInputHolder;
    _slider;

    constructor(appendTarget)
    {
        $(document).ready(() =>
        {
            let $textInputHolder = $("<input>",
            {
                value: MCCommandSound.DefaultPitch
            })

            $textInputHolder.on("blur", () =>
            {
                var value = $textInputHolder.val();
                this.OnUpdateValue(value);
            });

            let $slider = $("<input>",
            {
                type: "range",
                min: MCCommandSound.MinPitch,
                max: MCCommandSound.MaxPitch,
                step: "0.01",
                value: MCCommandSound.DefaultPitch
            }).appendTo(appendTarget);

            $slider.on("input", () =>
            {
                var value = $slider.val();
                this.OnUpdateValue(value);
            });

            $slider.appendTo(appendTarget);
            $textInputHolder.appendTo(appendTarget);

            this._textInputHolder = $textInputHolder;
            this._slider = $slider;
        });
    }

    OnUpdateValue(value)
    {
        let numericPart = value.match(/-?\d+(\.\d+)?/)[0];

        if (numericPart == null)
        {
            numericPart = MCCommandSound.DefaultPitch;
        }

        if (numericPart < MCCommandSound.MinPitch)
        {
            numericPart = MCCommandSound.MinPitch;
        }

        if (numericPart > MCCommandSound.MaxPitch)
        {
            numericPart = MCCommandSound.MaxPitch;
        }

        var floatValue = parseFloat(numericPart);
        SoundManager.SetPitch(floatValue);
        this._textInputHolder.val(floatValue);
        this._slider.val(floatValue);
    }
}