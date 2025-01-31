import { SoundManager } from "./SoundManager.js";

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
                navigator.clipboard.writeText(commandSound.ToString());
                SoundManager.Instance.Play(commandSound);
            });
        });
    }
}