import { SavedCompositionsModel, nextCompositionName as findNextCompositionName } from './Model/Composition/SavedCompositionsModel.ts';
import * as layout from './Layout.css.ts';
import * as settingsStyles from './Settings.css.ts';
import * as styles from './Compositions.css.ts';
import type { SoundComposition } from './SoundComposition.ts';
import type { SavedCompositionsValue } from './LocalStorageSchema.ts';
import { revealAddedItem } from './RevealAddedItem.ts';
import { createCopyButton } from './CopyButton.ts';
import { formatSoundCommand } from './FormatSoundCommand.ts';
import { localStorageStore } from './LocalStorage.ts';
import { LocalStorageSchema, normalizeCompositionName } from './LocalStorageSchema.ts';
import { confirmAction, promptText } from './ConfirmDialog.ts';
import { showToast } from './Toast.ts';
import { Text } from './Text.ts';

/** 現在の日本語文言を渡し、Modelに連番の空きを求める。 */
export function nextCompositionName(items: readonly { name: string }[]): string {
    return findNextCompositionName(items, Text.savedCompositionDefaultName);
}

/** 保存一覧の画面。値と編集ルールはModelに委譲する。 */
export class SavedCompositions {
    readonly version: string;
    readonly composition: SoundComposition;
    readonly model = new SavedCompositionsModel();
    /** 表示用に行まで複製した保存一覧を返す。 */
    get items(): SavedCompositionsValue { return this.model.read(); }
    writable: boolean;
    readonly saveButton: HTMLButtonElement;
    readonly list: HTMLElement;
    readonly status: HTMLElement;
    readonly tab: HTMLElement;
    static MaxItems = SavedCompositionsModel.MaxItems;
    constructor(composition: SoundComposition, version: string) {
        this.version = version;
        this.composition = composition;
        this.writable = true;
        try { this.model.replace(localStorageStore.readEntry(LocalStorageSchema.SavedCompositions)); }
        catch (error) { console.error(error); this.writable = false; }
        const saveButton = document.querySelector<HTMLButtonElement>('#save-composition');
        const list = document.getElementById('saved-compositions-list');
        const status = document.getElementById('saved-compositions-status');
        const tab = document.getElementById('compositions-tab');
        if (!saveButton || !list || !status || !tab) throw new Error('Missing saved compositions element');
        this.saveButton = saveButton;
        this.list = list;
        this.status = status;
        this.tab = tab;
        this.saveButton.addEventListener('click', () => {
            if (!composition.rows.length || composition.rows.length > 10) return;
            const name = nextCompositionName(this.items);
            const item = { id: crypto.randomUUID(), name, version: this.version, sounds: composition.rows.map(row => ({ ...row })) };
            if (this.write([...this.items, item])) {
                this.tab.click();
                revealAddedItem(this.list);
                showToast(Text.savedCompositionSaved);
            }
        });
        this.tab.addEventListener('click', () => this.render());
        composition.onChange = () => this.render();
        this.render();
    }
    /** 保存候補を検証し、書き込み成功後にModelと表示を更新する。 */
    write(items: SavedCompositionsValue): boolean {
        if (items.length > SavedCompositions.MaxItems && items.length > this.items.length) {
            showToast(Text.savedCompositionLimit(SavedCompositions.MaxItems));
            return false;
        }
        try {
            if (!this.writable) return false;
            const validated = this.model.validateChange(items);
            localStorageStore.writeEntry(LocalStorageSchema.SavedCompositions, validated);
            this.model.replace(validated);
            this.render();
            return true;
        } catch (error) { console.error(error); showToast(Text.savedCompositionFailure); return false; }
    }
    render() {
        this.saveButton.disabled = !this.writable || !this.composition.rows.length || this.composition.rows.length > 10;
        this.status.textContent = !this.writable ? Text.savedCompositionFailure : this.items.length ? '' : Text.savedCompositionEmpty;
        const list = this.list;
        list.replaceChildren();
        for (const item of this.items) {
            const card = document.createElement('div'); card.className = styles.savedComposition;
            const heading = document.createElement('div'); heading.className = layout.sectionHeading;
            const title = document.createElement('strong'); title.textContent = item.name;
            const count = document.createElement('span'); count.textContent = Text.compositionCount(item.sounds.length);

            const version = document.createElement('span'); version.className = styles.savedCompositionVersion;
            version.textContent = Text.savedCompositionVersion(item.version || Text.savedCompositionVersionUnknown);
            const nameGroup = document.createElement('div'); nameGroup.className = styles.savedCompositionHeading;
            nameGroup.append(version, count);
            const titleGroup = document.createElement('div'); titleGroup.className = styles.savedCompositionTitle;
            const edit = document.createElement('button'); edit.type = 'button'; edit.className = `${settingsStyles.settingsButton} ${styles.savedCompositionEdit}`;
            edit.title = Text.savedCompositionRename;
            edit.setAttribute('aria-label', Text.savedCompositionRename);
            edit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15Z"/></svg>';
            edit.addEventListener('click', async () => {
                const name = await promptText(Text.savedCompositionRename, {
                    value: item.name, maxLength: 20, acceptLabel: Text.savedCompositionRenameAccept,
                    validate: value => {
                        try { return normalizeCompositionName(value); }
                        catch { throw new Error(Text.savedCompositionNameInvalid); }
                    },
                });
                if (name !== null && name !== item.name && this.items.some(value => value.id === item.id)) {
                    if (this.write(this.model.withName(item.id, name)))
                        showToast(Text.savedCompositionSaved);
                }
            });
            titleGroup.append(title, edit);
            heading.append(titleGroup, nameGroup);
            const missing = this.composition.events ? item.sounds.filter(sound => !this.composition.events?.has(sound.name)) : [];
            const warning = document.createElement('p'); warning.className = layout.sectionNote;
            warning.textContent = missing.length ? Text.savedCompositionUnavailable : '';
            warning.hidden = !missing.length;
            const sounds = document.createElement('div'); sounds.className = styles.savedCompositionSounds;
            for (const sound of item.sounds) {
                const line = document.createElement('div');
                const command = formatSoundCommand(sound);
                line.textContent = command; line.title = command;
                sounds.append(line);
            }
            const actions = document.createElement('div'); actions.className = styles.compositionActions;
            const load = document.createElement('button'); load.type = 'button'; load.className = `${settingsStyles.settingsButton} ${styles.savedCompositionLoad}`; load.textContent = Text.savedCompositionLoad;
            load.disabled = !this.composition.events || missing.length > 0;
            load.addEventListener('click', async () => {
                if (!this.composition.events || item.sounds.some(sound => !this.composition.events?.has(sound.name))) return;
                if (this.composition.rows.length && !await confirmAction(Text.savedCompositionLoadConfirm(item.name), { acceptLabel: Text.savedCompositionLoad })) return;
                if (this.composition.save(item.sounds.map(row => ({ ...row })))) {
                    this.composition.stop(); this.composition.render();
                }
            });
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = `${settingsStyles.settingsButton} ${styles.savedCompositionDelete}`;
            remove.title = Text.savedCompositionDelete;
            remove.setAttribute('aria-label', Text.savedCompositionDeleteConfirm(item.name));
            remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
            remove.addEventListener('click', async () => {
                if (await confirmAction(Text.savedCompositionDeleteConfirm(item.name), { acceptLabel: Text.confirmDelete }) && this.items.some(value => value.id === item.id))
                    this.write(this.model.withoutItem(item.id));
            });
            const overwrite = document.createElement('button'); overwrite.type = 'button';
            overwrite.className = settingsStyles.settingsButton; overwrite.textContent = Text.savedCompositionOverwrite;
            overwrite.disabled = !this.writable || !this.composition.rows.length || this.composition.rows.length > 10;
            overwrite.addEventListener('click', async () => {
                const sounds = this.composition.rows.map(row => ({ ...row }));
                if (!sounds.length || sounds.length > 10) return;
                if (!await confirmAction(Text.savedCompositionOverwriteConfirm(item.name), { acceptLabel: Text.savedCompositionOverwrite })) return;
                if (!this.items.some(value => value.id === item.id)) return;
                if (this.write(this.model.withSounds(item.id, sounds, this.version)))
                    showToast(Text.savedCompositionSaved);
            });
            const copy = createCopyButton(() => item.sounds.map(sound => formatSoundCommand(sound)).join('\n'));
            copy.classList.add(styles.savedCompositionCopy);
            actions.append(remove, copy, overwrite, load); card.append(heading, sounds, warning, actions); list.append(card);
        }
    }
}
