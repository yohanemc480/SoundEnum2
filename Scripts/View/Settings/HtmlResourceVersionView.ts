import type { ResourceVersionView } from '../../Contracts/Views/ResourceVersionView.ts';
import { Text } from '../../I18n/Text.ts';

/** バージョン選択欄と失敗メッセージを表示する。 */
export class HtmlResourceVersionView implements ResourceVersionView {
    private readonly select: HTMLSelectElement;
    private readonly message: HTMLElement;
    private readonly lifecycle = new AbortController();
    private change?: (version: string) => void;
    constructor() {
        const select = document.querySelector<HTMLSelectElement>('#resource-version');
        if (!select) throw new Error('Missing resource version selector');
        this.select = select; this.message = document.createElement('p'); this.message.setAttribute('role', 'alert');
        this.message.hidden = true; select.parentElement?.append(this.message);
        select.addEventListener('change', () => this.change?.(select.value), { signal: this.lifecycle.signal });
    }
    bind(change: (version: string) => void): () => void { this.change = change; return () => { this.change = undefined; }; }
    showLoading(): void { this.select.disabled = true; this.message.hidden = true; }
    showVersions(versions: readonly string[], selected: string): void {
        this.select.replaceChildren(...versions.map(version => new Option(version, version)));
        this.select.value = selected; this.select.disabled = false; this.message.hidden = true;
    }
    showFailure(): void { this.select.disabled = true; this.message.textContent = Text.versionLoadFailure; this.message.hidden = false; }
    /** 入力購読と、このViewが追加したエラー表示を解放する。 */
    dispose(): void { this.lifecycle.abort(); this.change = undefined; this.message.remove(); }
}
