import { SoundManager } from "./Singletons/SoundManager.js";
import { copyCommand } from "./CopyCommand.js";

/**
 * 再生履歴一つを表すクラス
 */
export class HistoryLog
{
    constructor(appendTarget, commandSound)
    {
        $(document).ready(() =>
        {
            let $button = $('<div>')
                .text(commandSound.ToString())
                .appendTo(appendTarget)
                .addClass('history-log');
            this._button = $button;
            // クリック時にサウンドの再生ができるように。
            $button.click(() =>
            {
                copyCommand(commandSound.ToString());
                SoundManager.Instance.Play(commandSound);
            });
        });
    }
}
