import * as styles from './CopyButton.css.ts';
import type { CopyText } from '../../../Contracts/Services/Clipboard.ts';
import { Text } from "../../../I18n/Text.ts";

/** クリック時点の最新テキストをコピーするボタンを生成する。 */
export function createCopyButton(getText: () => string, copyText: CopyText): HTMLButtonElement
{
    const button = document.createElement('button');
    button.type = 'button';
    button.className = styles.button;
    button.title = Text.copy;
    button.setAttribute('aria-label', Text.copy);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>';
    button.querySelector('svg')?.classList.add(styles.icon);
    button.addEventListener('click', event => {
        event.stopPropagation();
        void copyText(getText());
    });
    return button;
}
