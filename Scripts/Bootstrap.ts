const status = document.getElementById('startup-status');
const message = document.getElementById('startup-message');
const retry = document.getElementById('startup-retry');
if (!status || !message || !retry) throw new Error('Missing startup UI');
retry.addEventListener('click', () => location.reload());

try {
    // Dynamic imports let this small entry point catch module and initialization errors.
    await import('./SettingsPopovers.ts');
    await import('./Main.ts');
    document.documentElement.removeAttribute('data-startup');
    status.hidden = true;
} catch (error) {
    console.error('Application startup failed', error);
    document.documentElement.dataset.startup = 'error';
    status.setAttribute('role', 'alert');
    message.textContent = '読み込みに失敗しました。接続を確認して再読み込みしてください。';
    retry.hidden = false;
}

export {};
