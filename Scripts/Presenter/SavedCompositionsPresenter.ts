import { SavedCompositionsModel, nextCompositionName } from '../Model/Composition/SavedCompositionsModel.ts';
import { CompositionModel } from '../Model/Composition/CompositionModel.ts';
import type { SavedComposition, SavedCompositionsValue } from '../Model/Composition/CompositionData.ts';
import type { CompositionEditor, CompositionEditorState } from '../Contracts/Services/CompositionEditor.ts';
import type { SavedCompositionsStore } from '../Contracts/Services/SavedCompositionsStore.ts';
import type { SavedCompositionsView } from '../Contracts/Views/SavedCompositionsView.ts';
import { formatSoundCommand } from '../FormatSoundCommand.ts';

/** 確認・名前入力・ID生成・通知をAppから注入する。 */
export interface SavedCompositionsInteractions {
    createId(): string;
    defaultName(number: number): string;
    rename(name: string): Promise<string | null>;
    confirm(operation: 'load' | 'remove' | 'overwrite', name: string): Promise<boolean>;
    notify(message: 'saved' | 'limit' | 'failure'): void;
}

/** 保存一覧の操作を調整する。保存成功時だけModelを確定し、古い確認結果は適用しない。 */
export class SavedCompositionsPresenter {
    private readonly model = new SavedCompositionsModel();
    private readonly view: SavedCompositionsView;
    private readonly store: SavedCompositionsStore;
    private readonly editor: CompositionEditor;
    private readonly version: string;
    private readonly interactions: SavedCompositionsInteractions;
    private readonly cleanup: (() => void)[];
    private writable = true;
    private disposed = false;
    private revision = 0;
    private editorRevision = 0;

    constructor(view: SavedCompositionsView, store: SavedCompositionsStore, editor: CompositionEditor,
        version: string, interactions: SavedCompositionsInteractions) {
        this.view = view; this.store = store; this.editor = editor; this.version = version; this.interactions = interactions;
        try { this.model.replace(store.read()); } catch { this.writable = false; }
        this.cleanup = [view.bind({ save: () => this.saveCurrent(), refresh: () => this.render(),
            rename: id => { void this.rename(id); }, load: id => { void this.load(id); },
            remove: id => { void this.remove(id); }, overwrite: id => { void this.overwrite(id); } }),
            editor.subscribeChanges(() => { ++this.editorRevision; this.render(); })];
        this.render();
    }
    /** 画面への出力値を生成する。読込前と現在のバージョンで使えない項目を区別する。 */
    private render(): void {
        if (this.disposed) return;
        const state = this.editor.read(), items = this.model.read();
        this.view.show({ writable: this.writable, canSave: this.writable && this.hasSavableRows(state),
            status: !this.writable ? 'failure' : items.length ? 'ready' : 'empty',
            items: items.map(item => ({ id: item.id, name: item.name, version: item.version,
                commands: item.sounds.map(row => formatSoundCommand(row)),
                missing: state.soundNames !== null && !this.canLoad(item, state), canLoad: this.canLoad(item, state) })) });
    }
    /** 空の組み合わせと、既存データの上限超過を新しい保存項目にしない。 */
    private hasSavableRows(state: CompositionEditorState): boolean {
        return state.rows.length > 0 && state.rows.length <= CompositionModel.MaxSounds;
    }
    /** 復元するサウンド名が現在のバージョンにすべて存在するか判定する。 */
    private canLoad(item: SavedComposition, state: CompositionEditorState): boolean {
        return state.soundNames !== null && item.sounds.every(row => state.soundNames?.includes(row.name));
    }
    /** 保存後に状態を確定する。破損データを読み込んだ場合は書き込まない。 */
    private write(items: SavedCompositionsValue): boolean {
        if (this.disposed || !this.writable) return false;
        const validated = this.model.validateChange(items);
        this.store.save(validated); this.model.replace(validated); ++this.revision; this.render(); return true;
    }
    /** 操作開始時点で確定している行を独立した保存項目にする。 */
    private saveCurrent(): void {
        if (this.disposed || !this.writable) return;
        const state = this.editor.read(); if (!this.hasSavableRows(state)) return;
        if (this.model.read().length >= SavedCompositionsModel.MaxItems) { this.interactions.notify('limit'); return; }
        try {
            const name = nextCompositionName(this.model.read(), this.interactions.defaultName);
            if (this.write(this.model.withAdded(this.interactions.createId(), name, this.version, state.rows))) {
                this.view.revealSaved(); this.interactions.notify('saved');
            }
        } catch { this.notifyFailure(); }
    }
    /** 名前入力中に一覧が変わった場合は古い入力結果を破棄する。 */
    private async rename(id: string): Promise<void> {
        const item = this.find(id); if (!item || !this.writable) return;
        const revision = this.revision;
        try {
            const name = await this.interactions.rename(item.name);
            if (name === null || name === item.name || !this.isCurrent(revision)) return;
            if (this.write(this.model.withName(id, name))) this.interactions.notify('saved');
        } catch { this.notifyFailure(); }
    }
    /** 確認前の編集中データが変わっていない場合だけ復元する。 */
    private async load(id: string): Promise<void> {
        const item = this.find(id); if (!item) return;
        const state = this.editor.read(); if (!this.canLoad(item, state)) return;
        const revision = this.revision, editorRevision = this.editorRevision;
        try {
            if (state.rows.length && !await this.interactions.confirm('load', item.name)) return;
            if (!this.isCurrent(revision) || editorRevision !== this.editorRevision || !this.canLoad(item, this.editor.read())) return;
            // 復元先が保存失敗を通知する。ここでは通知を重ねない。
            this.editor.replace(item.sounds.map(row => ({ ...row })));
        } catch { this.notifyFailure(); }
    }
    /** 確認後も同じ一覧である場合だけ指定IDを削除する。 */
    private async remove(id: string): Promise<void> {
        const item = this.find(id); if (!item || !this.writable) return;
        const revision = this.revision;
        try {
            if (await this.interactions.confirm('remove', item.name) && this.isCurrent(revision)) this.write(this.model.withoutItem(id));
        } catch { this.notifyFailure(); }
    }
    /** 確認中の編集や一覧更新を検出し、別の内容での上書きを防ぐ。 */
    private async overwrite(id: string): Promise<void> {
        const item = this.find(id); if (!item || !this.writable) return;
        const state = this.editor.read(); if (!this.hasSavableRows(state)) return;
        const revision = this.revision, editorRevision = this.editorRevision;
        try {
            if (!await this.interactions.confirm('overwrite', item.name) || !this.isCurrent(revision) || editorRevision !== this.editorRevision) return;
            if (this.write(this.model.withSounds(id, state.rows, this.version))) this.interactions.notify('saved');
        } catch { this.notifyFailure(); }
    }
    /** 破棄後の操作や存在しないIDを無視する。 */
    private find(id: string): SavedComposition | undefined { return this.disposed ? undefined : this.model.read().find(item => item.id === id); }
    /** 非同期操作の開始時と同じ状態か判定する。 */
    private isCurrent(revision: number): boolean { return !this.disposed && revision === this.revision; }
    /** 破棄後に届いた例外で通知を表示しない。 */
    private notifyFailure(): void { if (!this.disposed) this.interactions.notify('failure'); }
    /** UI・編集画面への購読を解除し、確認待ちの操作を無効化する。 */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true; ++this.revision; this.cleanup.forEach(dispose => dispose());
    }
}
