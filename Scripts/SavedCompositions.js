import { revealAddedItem } from './RevealAddedItem.js';
import { createCopyButton } from './CopyButton.js';
import { formatSoundCommand } from './FormatSoundCommand.js';
import { localStorageStore } from './LocalStorage.js';
import { LocalStorageSchema, normalizeCompositionName } from './LocalStorageSchema.js';
import { confirmAction, promptText } from './ConfirmDialog.js';
import { showToast } from './Toast.js';
import { Text } from './Text.js';

export function nextCompositionName(items) {
    const names = new Set(items.map(item => normalizeCompositionName(item.name)));
    let number = 1;
    while (names.has(normalizeCompositionName(Text.savedCompositionDefaultName(number)))) number++;
    return normalizeCompositionName(Text.savedCompositionDefaultName(number));
}

export class SavedCompositions {
    static MaxItems = 30;
    constructor(composition, version) {
        this.version = version;
        this.composition = composition;
        this.items = [];
        this.writable = true;
        try { this.items = localStorageStore.readEntry(LocalStorageSchema.SavedCompositions); }
        catch (error) { console.error(error); this.writable = false; }
        this.saveButton = document.getElementById('save-composition');
        this.saveButton.addEventListener('click', () => {
            if (!composition.rows.length || composition.rows.length > 10) return;
            const name = nextCompositionName(this.items);
            const item = { id: crypto.randomUUID(), name, version: this.version, sounds: composition.rows.map(row => ({ ...row })) };
            if (this.write([...this.items, item])) {
                document.getElementById('compositions-tab').click();
                revealAddedItem(document.getElementById('saved-compositions-list'));
                showToast(Text.savedCompositionSaved);
            }
        });
        document.getElementById('compositions-tab').addEventListener('click', () => this.render());
        composition.onChange = () => this.render();
        this.render();
    }
    write(items) {
        if (items.length > SavedCompositions.MaxItems && items.length > this.items.length) {
            showToast(Text.savedCompositionLimit(SavedCompositions.MaxItems));
            return false;
        }
        try {
            if (!this.writable) return false;
            localStorageStore.writeEntry(LocalStorageSchema.SavedCompositions, items);
            this.items = items;
            this.render();
            return true;
        } catch (error) { console.error(error); showToast(Text.savedCompositionFailure); return false; }
    }
    render() {
        this.saveButton.disabled = !this.writable || !this.composition.rows.length || this.composition.rows.length > 10;
        document.getElementById('saved-compositions-status').textContent = !this.writable ? Text.savedCompositionFailure : this.items.length ? '' : Text.savedCompositionEmpty;
        const list = document.getElementById('saved-compositions-list');
        list.replaceChildren();
        for (const item of this.items) {
            const card = document.createElement('div'); card.className = 'saved-composition';
            const heading = document.createElement('div'); heading.className = 'section-heading';
            const title = document.createElement('strong'); title.textContent = item.name;
            const count = document.createElement('span'); count.textContent = Text.compositionCount(item.sounds.length);

            const version = document.createElement('span'); version.className = 'saved-composition-version';
            version.textContent = Text.savedCompositionVersion(item.version || Text.savedCompositionVersionUnknown);
            const nameGroup = document.createElement('div'); nameGroup.className = 'saved-composition-heading';
            nameGroup.append(version, count);
            const titleGroup = document.createElement('div'); titleGroup.className = 'saved-composition-title';
            const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'settings-button saved-composition-edit';
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
                if (name !== null && name !== item.name) {
                    if (this.write(this.items.map(value => value.id === item.id ? { ...value, name } : value)))
                        showToast(Text.savedCompositionSaved);
                }
            });
            titleGroup.append(title, edit);
            heading.append(titleGroup, nameGroup);
            const missing = this.composition.events ? item.sounds.filter(sound => !this.composition.events.has(sound.name)) : [];
            const warning = document.createElement('p'); warning.className = 'section-note';
            warning.textContent = missing.length ? Text.savedCompositionUnavailable : '';
            warning.hidden = !missing.length;
            const sounds = document.createElement('div'); sounds.className = 'saved-composition-sounds';
            for (const sound of item.sounds) {
                const line = document.createElement('div');
                const command = formatSoundCommand(sound);
                line.textContent = command; line.title = command;
                sounds.append(line);
            }
            const actions = document.createElement('div'); actions.className = 'composition-actions';
            const load = document.createElement('button'); load.type = 'button'; load.className = 'settings-button saved-composition-load'; load.textContent = Text.savedCompositionLoad;
            load.disabled = !this.composition.events || missing.length > 0;
            load.addEventListener('click', async () => {
                if (!this.composition.events || item.sounds.some(sound => !this.composition.events.has(sound.name))) return;
                if (this.composition.rows.length && !await confirmAction(Text.savedCompositionLoadConfirm(item.name), { acceptLabel: Text.savedCompositionLoad })) return;
                if (this.composition.save(item.sounds.map(row => ({ ...row })))) {
                    this.composition.stop(); this.composition.render();
                }
            });
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'settings-button saved-composition-delete';
            remove.title = Text.savedCompositionDelete;
            remove.setAttribute('aria-label', Text.savedCompositionDeleteConfirm(item.name));
            remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
            remove.addEventListener('click', async () => {
                if (await confirmAction(Text.savedCompositionDeleteConfirm(item.name), { acceptLabel: Text.confirmDelete }))
                    this.write(this.items.filter(value => value.id !== item.id));
            });
            const overwrite = document.createElement('button'); overwrite.type = 'button';
            overwrite.className = 'settings-button'; overwrite.textContent = Text.savedCompositionOverwrite;
            overwrite.disabled = !this.writable || !this.composition.rows.length || this.composition.rows.length > 10;
            overwrite.addEventListener('click', async () => {
                const sounds = this.composition.rows.map(row => ({ ...row }));
                if (!sounds.length || sounds.length > 10) return;
                if (!await confirmAction(Text.savedCompositionOverwriteConfirm(item.name), { acceptLabel: Text.savedCompositionOverwrite })) return;
                if (this.write(this.items.map(value => value.id === item.id ? { ...value, sounds, version: this.version } : value)))
                    showToast(Text.savedCompositionSaved);
            });
            const copy = createCopyButton(() => item.sounds.map(sound => formatSoundCommand(sound)).join('\n'));
            copy.classList.add('saved-composition-copy');
            actions.append(remove, copy, overwrite, load); card.append(heading, sounds, warning, actions); list.append(card);
        }
    }
}
