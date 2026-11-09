/** 保存項目への操作はIDで通知する。 */
export interface SavedCompositionsActions {
    save(): void;
    refresh(): void;
    rename(id: string): void;
    load(id: string): void;
    remove(id: string): void;
    overwrite(id: string): void;
}
/** 表示用の保存項目。コマンド生成や利用可否の判断はPresenterで済ませる。 */
export interface SavedCompositionDisplayItem {
    id: string;
    name: string;
    version: string;
    commands: string[];
    missing: boolean;
    canLoad: boolean;
}
/** 保存一覧全体の表示状態。 */
export interface SavedCompositionsDisplayState {
    items: SavedCompositionDisplayItem[];
    writable: boolean;
    canSave: boolean;
    status: 'ready' | 'empty' | 'failure';
}
/** 保存一覧の表示と操作通知。保存や確認ダイアログの判断は行わない。 */
export interface SavedCompositionsView {
    bind(actions: SavedCompositionsActions): () => void;
    show(state: SavedCompositionsDisplayState): void;
    revealSaved(): void;
}
