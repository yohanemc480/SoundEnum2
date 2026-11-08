let timer;
let redisplayTimer;

/**
 * 画面下に一時的な通知を表示する。連続した通知は一度消してから最新の内容を表示する。
 * @param {string} message 表示するメッセージ
 * @param {number} duration 表示時間（ミリ秒）
 */
export function showToast(message, duration = 2000)
{
    const toast = document.querySelector('#toast');
    clearTimeout(timer);
    clearTimeout(redisplayTimer);
    const display = () => {
        toast.textContent = message;
        toast.classList.add('is-visible');
        timer = setTimeout(() => toast.classList.remove('is-visible'), duration);
    };
    if (toast.textContent) {
        toast.classList.remove('is-visible');
        // CSS のフェードアウト（150ms）が終わってから表示し直す。
        // 待機中の再呼び出しでは、古い通知の再表示をキャンセルする。
        redisplayTimer = setTimeout(display, 180);
    } else {
        display();
    }
}
