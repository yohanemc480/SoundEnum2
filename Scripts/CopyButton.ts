import { copyCommand } from "./CopyCommand.ts";
import { Text } from "./Text.ts";

export function createCopyButton(getText: () => string): HTMLButtonElement
{
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    button.title = Text.copy;
    button.setAttribute('aria-label', Text.copy);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>';
    button.addEventListener('click', event => {
        event.stopPropagation();
        copyCommand(getText());
    });
    return button;
}
