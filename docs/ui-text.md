# 表示文言の編集

画面の文言は `Scripts/Text.js` の `Text` にまとめています。日本語のみを扱います。

- JavaScriptでは `Text.copySuccess` のようにプロパティを参照します。キーを別のenumに重複定義する必要はありません。
- 件数などを含む文言は `Text.durationResults(count, first, last)` のように関数で取得します。
- HTMLでは `data-i18n="historyTitle"` で本文を指定します。子要素がある場合は、文言専用の `span` に指定してください。
- 属性は `data-i18n-aria-label`、`data-i18n-title`、`data-i18n-placeholder` で指定します。空欄の案内は `data-i18n-data-empty-text` を指定し、CSSの `attr(data-empty-text)` から表示します。

起動時に `applyText()` が音声データ取得前に反映します。HTMLで未定義のキーを指定するとエラーになります。文言は `textContent` または属性に設定し、HTMLとして解釈しません。

サウンドID・コマンドの引数・数値・開発者向けログは辞書の対象外です。
