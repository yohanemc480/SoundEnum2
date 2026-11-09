import type { SoundCommand } from '../../FormatSoundCommand.ts';

/** 編集中の行と、現在のバージョンで利用できるサウンド名。nullは読込前を示す。 */
export interface CompositionEditorState {
    rows: SoundCommand[];
    soundNames: string[] | null;
}
/** 保存一覧から編集画面へ接続する境界。DOMや具体的なPresenterは公開しない。 */
export interface CompositionEditor {
    read(): CompositionEditorState;
    subscribeChanges(listener: () => void): () => void;
    replace(rows: SoundCommand[]): boolean;
}
