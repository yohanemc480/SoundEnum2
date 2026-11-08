import { showToast } from "./Toast.js";

/** コピーの結果を、レイアウトを動かさない通知で伝える。 */
export async function copyCommand(text)
{
    try {
        await navigator.clipboard.writeText(text);
        showToast('コピーしました');
    } catch {
        showToast('コピーできませんでした');
    }
}
