import { HtmlSavedCompositionsView } from '../View/Composition/HtmlSavedCompositionsView.ts';
import { SavedCompositionsPresenter } from '../Presenter/SavedCompositionsPresenter.ts';
import { LocalSavedCompositionsStore } from '../Infrastructure/Storage/LocalSavedCompositionsStore.ts';
import { SavedCompositionsModel } from '../Model/Composition/SavedCompositionsModel.ts';
import { normalizeCompositionName } from '../Model/Composition/CompositionData.ts';
import type { CompositionEditor } from '../Contracts/Services/CompositionEditor.ts';
import { confirmAction, promptText } from '../View/Components/ConfirmDialog/ConfirmDialog.ts';
import { showToast } from '../View/Components/Toast/Toast.ts';
import { Text } from '../I18n/Text.ts';

/** 保存一覧の各層と、既存の確認ダイアログ・通知を接続する。 */
export function createSavedCompositionsScreen(editor: CompositionEditor, version: string) {
    const view = new HtmlSavedCompositionsView();
    const presenter = new SavedCompositionsPresenter(view, new LocalSavedCompositionsStore(), editor, version, {
        createId: () => crypto.randomUUID(), defaultName: Text.savedCompositionDefaultName,
        rename: name => promptText(Text.savedCompositionRename, { value: name, maxLength: 20, acceptLabel: Text.savedCompositionRenameAccept,
            validate: value => { try { return normalizeCompositionName(value); } catch { throw new Error(Text.savedCompositionNameInvalid); } } }),
        confirm: (operation, name) => operation === 'load'
            ? confirmAction(Text.savedCompositionLoadConfirm(name), { acceptLabel: Text.savedCompositionLoad })
            : operation === 'remove' ? confirmAction(Text.savedCompositionDeleteConfirm(name), { acceptLabel: Text.confirmDelete })
                : confirmAction(Text.savedCompositionOverwriteConfirm(name), { acceptLabel: Text.savedCompositionOverwrite }),
        notify: message => showToast(message === 'saved' ? Text.savedCompositionSaved : message === 'limit'
            ? Text.savedCompositionLimit(SavedCompositionsModel.MaxItems) : Text.savedCompositionFailure),
    });
    return { dispose: () => { presenter.dispose(); view.dispose(); } };
}
