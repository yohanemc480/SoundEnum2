import { HistoryLog } from "./HistoryLog.js";

/**
 * 再生履歴のマネージャークラス
 */
export class HistoryManager
{
    static Instance = null;
    latestSound = null;

    constructor()
    {
        if (HistoryManager.Instance)
        {
            return HistoryManager.Instance;
        }
        HistoryManager.Instance = this;
    }

    /**
     * 再生履歴を登録する。
     */
    static Register(commandSound)
    {
        if (this.Instance.latestSound == null || !this.Instance.latestSound.Equals(commandSound))
        {
            new HistoryLog(".history", commandSound);
            this.Instance.latestSound = commandSound;
        }
    }

    /**
     * 一番下までスクロールを進める。
     */
    static ScrollToBottom()
    {
        $(document).ready(() =>
        {
            let $container = $(".history");
            $container.scrollTop($container[0].scrollHeight);
        })
    }
}