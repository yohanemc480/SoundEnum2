import type { Clipboard } from '../Contracts/Services/Clipboard.ts';

/** コピーを実行し、成功・失敗を通知する。ブラウザAPIや通知UIは所有しない。 */
export class CopyCommandPresenter {
    private readonly clipboard: Clipboard;
    private readonly notify: (result: 'success' | 'failure') => void;
    constructor(clipboard: Clipboard, notify: (result: 'success' | 'failure') => void) {
        this.clipboard = clipboard; this.notify = notify;
    }
    /** 書き込み結果が確定してから通知する。拒否されても呼び出し元の操作を中断しない。 */
    async copy(text: string): Promise<void> {
        try { await this.clipboard.writeText(text); }
        catch { this.notify('failure'); return; }
        this.notify('success');
    }
}
