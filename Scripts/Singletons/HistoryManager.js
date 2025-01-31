import { HistoryLog } from "../HistoryLog.js";
import { SingletonBase } from "./SingletonBase.js";

/**
 * 再生履歴のマネージャークラス
 */
export class HistoryManager extends SingletonBase
{
    _latestSound = null;

    constructor()
    {
        super();
    }

    /**
     * 再生履歴を登録する。
     */
    Register(commandSound)
    {
        if (this._latestSound == null || !this._latestSound.Equals(commandSound))
        {
            new HistoryLog(".history", commandSound);
            this.latestSound = commandSound;
        }
    }

    /**
     * 一番下までスクロールを進める。
     */
    ScrollToBottom()
    {
        $(document).ready(() =>
        {
            let $container = $(".history");
            $container.scrollTop($container[0].scrollHeight);
        })
    }
}