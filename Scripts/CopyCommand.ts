import { Text } from "./Text.ts";
import { showToast } from "./Toast.ts";

/** コピーの結果を、レイアウトを動かさない通知で伝える。 */
export async function copyCommand(text: string): Promise<void>
{
    try {
        await navigator.clipboard.writeText(text);
        showToast(Text.copySuccess);
    } catch {
        showToast(Text.copyFailure);
    }
}
