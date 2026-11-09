import * as layout from '../Layout/Layout.css.ts';
import * as settingsStyles from '../Settings/Settings.css.ts';
import * as styles from './Compositions.css.ts';
import { createCopyButton } from '../Components/CopyButton/CopyButton.ts';
import { revealAddedItem } from '../Components/RevealAddedItem.ts';
import { Text } from '../../I18n/Text.ts';
import type { SavedCompositionsView, SavedCompositionsActions, SavedCompositionsDisplayState } from '../../Contracts/Views/SavedCompositionsView.ts';

/** 保存項目のカードを表示し、操作対象のIDだけを通知する。 */
export class HtmlSavedCompositionsView implements SavedCompositionsView {
    private actions?: SavedCompositionsActions;
    private readonly lifecycle = new AbortController();
    private readonly saveButton: HTMLButtonElement;
    private readonly list: HTMLElement;
    private readonly status: HTMLElement;
    private readonly tab: HTMLElement;
    constructor() {
        const saveButton = document.querySelector<HTMLButtonElement>('#save-composition');
        const list = document.getElementById('saved-compositions-list');
        const status = document.getElementById('saved-compositions-status');
        const tab = document.getElementById('compositions-tab');
        if (!saveButton || !list || !status || !tab) throw new Error('Missing saved compositions element');
        this.saveButton = saveButton; this.list = list; this.status = status; this.tab = tab;
        saveButton.addEventListener('click', () => this.actions?.save(), { signal: this.lifecycle.signal });
        tab.addEventListener('click', () => this.actions?.refresh(), { signal: this.lifecycle.signal });
    }
    bind(actions: SavedCompositionsActions): () => void { this.actions = actions; return () => { this.actions = undefined; }; }
    /** 値として受け取ったコマンドと操作可否をカードへ反映する。 */
    show(state: SavedCompositionsDisplayState): void {
        this.saveButton.disabled = !state.canSave;
        this.status.textContent = state.status === 'failure' ? Text.savedCompositionFailure : state.status === 'empty' ? Text.savedCompositionEmpty : '';
        const list = this.list; list.replaceChildren();
        for (const item of state.items) {
            const card = document.createElement('div'); card.className = styles.savedComposition;
            const heading = document.createElement('div'); heading.className = layout.sectionHeading;
            const title = document.createElement('strong'); title.textContent = item.name;
            const count = document.createElement('span'); count.textContent = Text.compositionCount(item.commands.length);

            const version = document.createElement('span'); version.className = styles.savedCompositionVersion;
            version.textContent = Text.savedCompositionVersion(item.version || Text.savedCompositionVersionUnknown);
            const nameGroup = document.createElement('div'); nameGroup.className = styles.savedCompositionHeading;
            nameGroup.append(version, count);
            const titleGroup = document.createElement('div'); titleGroup.className = styles.savedCompositionTitle;
            const edit = document.createElement('button'); edit.type = 'button'; edit.className = `${settingsStyles.settingsButton} ${styles.savedCompositionEdit}`;
            edit.title = Text.savedCompositionRename;
            edit.setAttribute('aria-label', Text.savedCompositionRename);
            edit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15Z"/></svg>';
            edit.disabled = !state.writable;
            edit.addEventListener('click', () => this.actions?.rename(item.id));
            titleGroup.append(title, edit);
            heading.append(titleGroup, nameGroup);
            const warning = document.createElement('p'); warning.className = layout.sectionNote;
            warning.textContent = item.missing ? Text.savedCompositionUnavailable : ''; warning.hidden = !item.missing;
            const sounds = document.createElement('div'); sounds.className = styles.savedCompositionSounds;
            for (const command of item.commands) {
                const line = document.createElement('div'); line.textContent = command; line.title = command; sounds.append(line);
            }
            const actions = document.createElement('div'); actions.className = styles.compositionActions;
            const load = document.createElement('button'); load.type = 'button'; load.className = `${settingsStyles.settingsButton} ${styles.savedCompositionLoad}`; load.textContent = Text.savedCompositionLoad;
            load.disabled = !item.canLoad;
            load.addEventListener('click', () => this.actions?.load(item.id));
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = `${settingsStyles.settingsButton} ${styles.savedCompositionDelete}`;
            remove.title = Text.savedCompositionDelete;
            remove.setAttribute('aria-label', Text.savedCompositionDeleteConfirm(item.name));
            remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
            remove.disabled = !state.writable;
            remove.addEventListener('click', () => this.actions?.remove(item.id));
            const overwrite = document.createElement('button'); overwrite.type = 'button';
            overwrite.className = settingsStyles.settingsButton; overwrite.textContent = Text.savedCompositionOverwrite;
            overwrite.disabled = !state.canSave;
            overwrite.addEventListener('click', () => this.actions?.overwrite(item.id));
            const copy = createCopyButton(() => item.commands.join('\n'));
            copy.classList.add(styles.savedCompositionCopy);
            actions.append(remove, copy, overwrite, load); card.append(heading, sounds, warning, actions); list.append(card);
        }
    }
    /** 保存タブを開き、追加されたカードを表示範囲へ入れる。 */
    revealSaved(): void { this.tab.click(); revealAddedItem(this.list); }
    /** 常設ボタンの購読とカードを解放する。 */
    dispose(): void { this.lifecycle.abort(); this.actions = undefined; this.list.replaceChildren(); }
}
