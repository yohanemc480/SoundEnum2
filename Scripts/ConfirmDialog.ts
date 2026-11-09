import { Text } from './Text.ts';

interface ConfirmOptions { acceptLabel?: string }
interface TextOptions {
    value: string;
    maxLength: number;
    validate?: (value: string) => string;
}
type PromptOptions = Partial<TextOptions> & ConfirmOptions;
let pending: Promise<unknown> = Promise.resolve();

/**
 * 確認UIの共通窓口。独自ダイアログへの差し替えもこの関数内で行う。
 * キャンセル・閉じる操作は false を返す。
 * @param {string} message
 * @param {{acceptLabel?: string}} options
 * @returns {Promise<boolean>}
 */
export function confirmAction(message: string, { acceptLabel = Text.confirmAccept }: ConfirmOptions = {}): Promise<boolean>
{
    const result = pending.then(() => openDialog(message, acceptLabel));
    pending = result.catch(() => {});
    return result;
}

export function promptText(message: string, { value = '', maxLength = 20, validate, acceptLabel = Text.confirmAccept }: PromptOptions = {}): Promise<string | null> {
    const result = pending.then(() => openDialog(message, acceptLabel, { value, maxLength, validate }));
    pending = result.catch(() => {});
    return result;
}

function openDialog(message: string, acceptLabel: string): Promise<boolean>;
function openDialog(message: string, acceptLabel: string, textOptions: TextOptions): Promise<string | null>;
function openDialog(message: string, acceptLabel: string, textOptions?: TextOptions): Promise<boolean | string | null>
{
    return new Promise<boolean | string | null>(resolve => {
        const previousFocus = document.activeElement;
        const dialog = document.createElement('dialog');
        dialog.className = 'confirm-dialog';
        dialog.setAttribute('aria-labelledby', 'confirm-dialog-title');
        dialog.setAttribute('aria-describedby', 'confirm-dialog-message');
        const title = document.createElement('h2');
        title.id = 'confirm-dialog-title';
        title.textContent = Text.confirmTitle;
        const description = document.createElement('p');
        description.id = 'confirm-dialog-message';
        description.textContent = message;
        const actions = document.createElement('div');
        actions.className = 'confirm-dialog-actions';
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'settings-button';
        cancel.textContent = Text.cancel;
        cancel.autofocus = true;
        const confirm = document.createElement('button');
        confirm.type = 'button';
        confirm.className = 'settings-button confirm-dialog-accept';
        confirm.textContent = acceptLabel;
        let input: HTMLInputElement | undefined;
        let resultValue = '';
        if (textOptions) {
            input = document.createElement('input');
            input.type = 'text'; input.value = textOptions.value;
            input.maxLength = textOptions.maxLength; input.required = true;
            input.className = 'dialog-text-input';
            input.setAttribute('aria-label', message);
            input.addEventListener('input', () => input?.setCustomValidity(''));
            input.addEventListener('keydown', event => {
                if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); confirm.click(); }
            });
        }
        let closing = false;
        const close = (accepted = false) => {
            if (closing) return;
            closing = true;
            confirm.disabled = true;
            cancel.disabled = true;
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                dialog.close(accepted ? 'confirmed' : '');
                return;
            }
            dialog.classList.add('is-closing');
            setTimeout(() => dialog.close(accepted ? 'confirmed' : ''), 120);
        };
        cancel.addEventListener('click', () => close());
        confirm.addEventListener('click', () => {
            if (input) {
                try { resultValue = textOptions?.validate ? textOptions.validate(input.value) : input.value; }
                catch (error) { input.setCustomValidity(error instanceof Error ? error.message : String(error)); input.reportValidity(); return; }
                if (!input.reportValidity()) return;
            }
            close(true);
        });
        dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
        let backdropPressed = false;
        const outside = (event: MouseEvent) => {
            const rect = dialog.getBoundingClientRect();
            return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
        };
        dialog.addEventListener('pointerdown', event => { backdropPressed = outside(event); });
        dialog.addEventListener('click', event => {
            if (backdropPressed && outside(event)) close();
            backdropPressed = false;
        });
        dialog.addEventListener('close', () => {
            const accepted = dialog.returnValue === 'confirmed';
            dialog.remove();
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
            resolve(textOptions ? (accepted ? resultValue : null) : accepted);
        }, { once: true });
        actions.append(cancel, confirm);
        dialog.append(title, description);
        if (input) dialog.append(input);
        dialog.append(actions);
        document.body.append(dialog);
        dialog.showModal();
        if (input) { input.focus(); input.select(); }
    });
}
