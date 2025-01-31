import { SoundManager } from "./SoundManager.js";
import { MCCommandSoundSource } from "./Constants/MCCommandSoundSource.js";

/**
 * ソース選択エリアを表すクラス
 */
export class SelectSourceArea
{
    _button;

    constructor(appendTarget)
    {
        $(document).ready(() =>
        {
            let $selectPullDown = $('<select>').appendTo(appendTarget);
            for (const key in MCCommandSoundSource)
            {
                const displayText = MCCommandSoundSource[key];
                const inputValue = key;
                $selectPullDown.append(
                    new Option(displayText, inputValue)
                );
            }

            $selectPullDown.change(function ()
            {
                // 選択されたオプションの値を取得
                var selectedKey = $(this).val();
                SoundManager.SetSource(MCCommandSoundSource[selectedKey]);
            });
        });
    }
}