import { localStorageStore } from './LocalStorage.ts';
import { LocalStorageSchema } from './LocalStorageSchema.ts';
import type { CompositionStore } from '../../Contracts/Services/CompositionStore.ts';
import type { SoundCommand } from '../../Model/Command/FormatSoundCommand.ts';

/** 既存の保存キーと検証を使い、編集中の組み合わせを永続化する。 */
export class LocalCompositionStore implements CompositionStore {
    read(): SoundCommand[] { return localStorageStore.readEntry(LocalStorageSchema.Composition); }
    save(rows: SoundCommand[]): void { localStorageStore.writeEntry(LocalStorageSchema.Composition, rows); }
}
