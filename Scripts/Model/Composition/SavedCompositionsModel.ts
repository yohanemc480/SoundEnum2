import type { SoundCommand } from '../Command/FormatSoundCommand.ts';
import { normalizeCompositionName, normalizeSavedCompositions } from './CompositionData.ts';
import type { SavedCompositionsValue } from './CompositionData.ts';

/** 表示文言を受け取り、使われていない最小の連番を付けた名前を返す。 */
export function nextCompositionName(items: readonly { name: string }[], defaultName: (number: number) => string): string {
    const names = new Set(items.map(item => normalizeCompositionName(item.name)));
    let number = 1;
    while (names.has(normalizeCompositionName(defaultName(number)))) number++;
    return normalizeCompositionName(defaultName(number));
}

/** 保存一覧の値と編集ルールを所有する。候補作成と保存後の確定を分ける。 */
export class SavedCompositionsModel {
    static readonly MaxItems = 30;
    private items: SavedCompositionsValue = [];

    /** 行まで複製し、編集中の組み合わせとの参照共有を防ぐ。 */
    read(): SavedCompositionsValue { return normalizeSavedCompositions(this.items); }

    /** 検証した一覧を確定する。過去の上限超過データの復元も許す。 */
    replace(items: unknown): void { this.items = normalizeSavedCompositions(items); }

    /** 保存前の候補を検証する。上限超過時でも削除や既存項目の編集は許す。 */
    validateChange(items: unknown): SavedCompositionsValue {
        const result = normalizeSavedCompositions(items);
        if (result.length > SavedCompositionsModel.MaxItems && result.length > this.items.length)
            throw new Error('Saved composition limit exceeded');
        return result;
    }

    /** 現在の行を独立した保存項目にする。IDと表示名は呼び出し元で用意する。 */
    withAdded(id: string, name: string, version: string, sounds: SoundCommand[]): SavedCompositionsValue {
        return this.validateChange([...this.items, { id, name, version, sounds }]);
    }

    /** 名前だけを変更した候補を返す。 */
    withName(id: string, name: string): SavedCompositionsValue {
        this.requireItem(id);
        return this.validateChange(this.items.map(item => item.id === id ? { ...item, name: normalizeCompositionName(name) } : item));
    }

    /** 指定項目の行とバージョンを更新し、IDと名前は保持する。 */
    withSounds(id: string, sounds: SoundCommand[], version: string): SavedCompositionsValue {
        this.requireItem(id);
        return this.validateChange(this.items.map(item => item.id === id ? { ...item, sounds, version } : item));
    }

    /** 指定IDだけを除いた候補を返す。 */
    withoutItem(id: string): SavedCompositionsValue {
        this.requireItem(id);
        return this.read().filter(item => item.id !== id);
    }

    /** 削除済み項目への遅れて届いた操作を検出する。 */
    private requireItem(id: string): void {
        if (!this.items.some(item => item.id === id)) throw new Error('Missing saved composition');
    }
}
