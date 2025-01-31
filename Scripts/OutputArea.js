/**
 * コマンドの出力エリアを表すクラス
 */
export class OutputArea
{
    _button;
    constructor(appendTarget, displayName)
    {
        $(document).ready(() =>
        {
            let $button = $('<div>').text(displayName).appendTo(appendTarget);
            $button.addClass('output-text');
            this._button = $button;

            // クリック時にコマンドをコピーできるように。
            $button.click(() =>
            {
                navigator.clipboard.writeText(this._button.text());
            });
        });
    }

    /**
     * 出力エリアにテキストを設定する。
     * @param {*} text
     */
    SetText(text)
    {
        this._button.text(text);
    }
}