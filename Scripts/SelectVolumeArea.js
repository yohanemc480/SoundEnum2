import { SoundManager } from "./SoundManager.js";
import { MCCommandSound } from "./MCCommandSound.js";

/**
 * サウンド音量調整エリアを表すクラス
 */
export class SelectVolumeArea
{
    _textInputHolder;
    constructor(appendTarget)
    {
        $(document).ready(() =>
        {
            let $textInputHolder = $("<input>",
            {
                value: MCCommandSound.DefaultVolume
            }).appendTo(appendTarget);

            $textInputHolder.on("blur", () =>
            {
                var value = $textInputHolder.val();
                this.OnUpdateValue(value);
            });

            this._textInputHolder = $textInputHolder;
        });
    }
    OnUpdateValue(value)
    {
        let numericPart = value.match(/-?\d+(\.\d+)?/)[0];

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
    }
}