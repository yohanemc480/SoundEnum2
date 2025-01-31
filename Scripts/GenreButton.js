import { SoundManager } from "./SoundManager.js";
import { HistoryManager } from "./HistoryManager.js";
import { MCCommandSelector } from "./Constants/MCCommandSelector.js";
import { GenreButtonGenerator } from "./GenreButtonGenerator.js";
import { MCCommandSound } from "./MCCommandSound.js";

/**
 * ジャンル選択ボタン。
 * 最後の選択の場合には再生ボタンも兼任している。
 */
export class GenreButton
{
    static className = 'genre-button';
    constructor(appendTarget, displayName, linkingNode, outputArea)
    {
        $(document).ready(function ()
        {
            let name;
            if (linkingNode.IsTreeEnd())
            {
                name = "[📣] " + displayName;
            }
            else
            {
                name = displayName;
            }
            // div要素を生成して追加する
            let button = $('<div>').text(name).appendTo(appendTarget);
            button.addClass(GenreButton.className);

            // クリックイベントを設定
            button.click(function ()
            {
                let depth = linkingNode.GetDepth();
                GenreButtonGenerator.RemoveClassFromGenreButtons(depth, 'selected');
                button.addClass('selected');
                GenreButtonGenerator.ClearGenreButtons(depth + 1);
                GenreButtonGenerator.ClearGenreButtons(depth + 2);
                GenreButtonGenerator.GenerateButtonsFromNodes(linkingNode.GetChildren(), outputArea);

                if (linkingNode.IsTreeEnd())
                {
                    let commandSound = new MCCommandSound(
                        linkingNode.GetPath(),
                        SoundManager.Instance.GetSource(),
                        MCCommandSelector.All,
                        SoundManager.Instance.GetVolume(),
                        SoundManager.Instance.GetPitch(),
                        SoundManager.Instance.GetMinVolume()
                    );
                    SoundManager.Instance.Play(commandSound);
                    // 出力エリアにコマンドを代入する。
                    outputArea.SetText(commandSound.ToString());
                    HistoryManager.Instance.Register(commandSound);
                    HistoryManager.Instance.ScrollToBottom();
                }
            });
        });
    }
}