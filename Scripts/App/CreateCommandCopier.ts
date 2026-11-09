import { BrowserClipboard } from '../Infrastructure/Clipboard/BrowserClipboard.ts';
import { CopyCommandPresenter } from '../Presenter/CopyCommandPresenter.ts';
import type { CopyText } from '../Contracts/Services/Clipboard.ts';
import { showToast } from '../View/Components/Toast/Toast.ts';
import { Text } from '../I18n/Text.ts';

/** コピーの実装と既存のトースト通知を接続し、表示部品へ渡す操作を返す。 */
export function createCommandCopier(): CopyText {
    const presenter = new CopyCommandPresenter(new BrowserClipboard(), result => showToast(result === 'success' ? Text.copySuccess : Text.copyFailure));
    return text => presenter.copy(text);
}
