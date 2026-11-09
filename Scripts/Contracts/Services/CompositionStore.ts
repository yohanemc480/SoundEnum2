import type { SoundCommand } from '../../FormatSoundCommand.ts';

/** 編集中の組み合わせを読み書きする。失敗は例外として通知する。 */
export interface CompositionStore {
    read(): SoundCommand[];
    save(rows: SoundCommand[]): void;
}
