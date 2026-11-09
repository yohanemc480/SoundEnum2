/** テキストをクリップボードへ書き込む。利用不可や拒否は例外で通知する。 */
export interface Clipboard { writeText(text: string): Promise<void> }

/** 表示部品が依頼するコピー操作。結果の通知は接続先が担当する。 */
export type CopyText = (text: string) => Promise<void>;
