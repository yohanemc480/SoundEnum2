import type { SoundCommand } from '../../FormatSoundCommand.ts';
import { normalizeComposition } from './CompositionData.ts';

/** 組み合わせの行と編集ルールを所有する。保存が成功してからreplaceで確定する。 */
export class CompositionModel {
    static readonly MaxSounds = 10;
    private rows: SoundCommand[] = [];

    /** 呼び出し元の変更が内部状態へ波及しないコピーを返す。 */
    read(): SoundCommand[] { return this.rows.map(row => ({ ...row })); }

    /** 検証した行を確定する。既存の上限超過データも復元し、削除による修復を許す。 */
    replace(rows: unknown): void { this.rows = normalizeComposition(rows); }

    /** 件数制限内で追加した候補を返す。まだ内部状態は変更しない。 */
    withAdded(row: SoundCommand): SoundCommand[] {
        if (this.rows.length >= CompositionModel.MaxSounds) throw new Error('Composition limit exceeded');
        return normalizeComposition([...this.rows, row]);
    }

    /** 指定行の設定を変更した候補を返し、名前と他の行は保持する。 */
    withSettings(index: number, settings: Omit<SoundCommand, 'name'>): SoundCommand[] {
        this.requireIndex(index);
        return normalizeComposition(this.rows.map((row, i) => i === index ? { ...settings, name: row.name } : row));
    }

    /** 指定行だけを除いた候補を返す。同名の別の行は削除しない。 */
    withoutRow(index: number): SoundCommand[] {
        this.requireIndex(index);
        return this.read().filter((_, i) => i !== index);
    }

    /** 存在しない行や整数でない位置への操作を拒否する。 */
    private requireIndex(index: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= this.rows.length) throw new Error('Invalid composition index');
    }
}
