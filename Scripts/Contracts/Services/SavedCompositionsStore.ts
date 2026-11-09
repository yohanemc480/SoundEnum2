import type { SavedCompositionsValue } from '../../Model/Composition/CompositionData.ts';

/** 保存一覧の永続化。読み書きの失敗は例外で通知する。 */
export interface SavedCompositionsStore {
    read(): SavedCompositionsValue;
    save(items: SavedCompositionsValue): void;
}
