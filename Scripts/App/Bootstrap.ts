const status = document.getElementById('startup-status');
const message = document.getElementById('startup-message');
const retry = document.getElementById('startup-retry');
if (!status || !message || !retry) throw new Error('Missing startup UI');
const lifecycle = new AbortController();
let disposePopovers: (() => void) | undefined;
/** 起動前に登録した購読を一度だけ解放する。 */
const dispose = () => { lifecycle.abort(); disposePopovers?.(); disposePopovers = undefined; };
retry.addEventListener('click', () => location.reload(), { signal: lifecycle.signal });
window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); }, { signal: lifecycle.signal });
if (import.meta.hot) import.meta.hot.dispose(dispose);

try {
    // 動的importにより、部品の読み込みや初期化の失敗を起動表示で捕捉する。
    const { initializeSettingsPopovers } = await import('./InitializeSettingsPopovers.ts');
    if (lifecycle.signal.aborted) throw new Error('Application disposed');
    disposePopovers = initializeSettingsPopovers();
    await import('./Main.ts');
    if (lifecycle.signal.aborted) throw new Error('Application disposed');
    document.documentElement.removeAttribute('data-startup');
    status.hidden = true;
} catch (error) {
    disposePopovers?.(); disposePopovers = undefined;
    if (lifecycle.signal.aborted) throw error;
    console.error('Application startup failed', error);
    document.documentElement.dataset.startup = 'error';
    status.setAttribute('role', 'alert');
    message.textContent = '読み込みに失敗しました。接続を確認して再読み込みしてください。';
    retry.hidden = false;
}

export {};
