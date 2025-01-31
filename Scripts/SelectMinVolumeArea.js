import { SoundManager } from "./Singletons/SoundManager.js";
import { MCCommandSound } from "./MCCommandSound.js";

/**
 * 最低音量調整エリアを表すクラス
 */
export class SelectMinVolumeArea
{
    _textInputHolder;
    _slider;

    constructor(appendTarget)
    {
        $(document).ready(() =>
        {
            let $textInputHolder = $("<input>",
            {
                value: MCCommandSound.DefaultMinVolume
            })

            $textInputHolder.on("blur", () =>
            {
                var value = $textInputHolder.val();
                this.OnUpdateValue(value);
            });

            let $slider = $("<input>",
            {
                type: "range",
                min: MCCommandSound.MinMinVolume,
                max: MCCommandSound.MaxMinVolume,
                step: "0.01",
                value: MCCommandSound.DefaultMinVolume
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
            numericPart = MCCommandSound.DefaultMinVolume;
        }

        if (numericPart < MCCommandSound.MinMinVolume)
        {
            numericPart = MCCommandSound.MinMinVolume;
        }

        if (numericPart > MCCommandSound.MaxMinVolume)
        {
            numericPart = MCCommandSound.MaxMinVolume;
        }

        var floatValue = parseFloat(numericPart);
        SoundManager.Instance.SetMinVolume(floatValue);
        this._textInputHolder.val(floatValue);
        this._slider.val(floatValue);
    }
}