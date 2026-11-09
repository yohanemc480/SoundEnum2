import type { Clipboard } from '../../Contracts/Services/Clipboard.ts';

/** ブラウザのClipboard APIによる書き込みを担当する。 */
export class BrowserClipboard implements Clipboard {
    async writeText(text: string): Promise<void> { await navigator.clipboard.writeText(text); }
}
