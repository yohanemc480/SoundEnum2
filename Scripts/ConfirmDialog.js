import { Text } from './Text.js';

let pending = Promise.resolve();

/**
 * 確認UIの共通窓口。独自ダイアログへの差し替えもこの関数内で行う。
 * キャンセル・閉じる操作は false を返す。
 * @param {string} message
 * @param {{acceptLabel?: string}} options
 * @returns {Promise<boolean>}
 */
export function confirmAction(message, { acceptLabel = Text.confirmAccept } = {})
{
    const result = pending.then(() => openDialog(message, acceptLabel));
    pending = result.catch(() => {});
    return result;
}

function openDialog(message, acceptLabel)
{
    return new Promise(resolve => {
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
        confirm.addEventListener('click', () => close(true));
        dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
        let backdropPressed = false;
        const outside = event => {
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
            if (previousFocus?.isConnected) previousFocus.focus();
            resolve(accepted);
        }, { once: true });
        actions.append(cancel, confirm);
        dialog.append(title, description, actions);
        document.body.append(dialog);
        dialog.showModal();
    });
}
