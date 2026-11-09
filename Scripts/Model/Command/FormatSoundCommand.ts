import { MCCommandSelector } from './MCCommandSelector.ts';
import type { SoundSource } from './MCCommandSoundSource.ts';

/** playsoundコマンドを構成するサウンド名と再生設定。 */
export interface SoundCommand {
    name: string;
    source: SoundSource;
    volume: number;
    pitch: number;
    minVolume: number;
}

export function formatSoundCommand({ name, source, volume, pitch, minVolume }: SoundCommand, selector: string = MCCommandSelector.All, position: string = '~ ~ ~'): string {
    return `playsound minecraft:${name} ${source} ${selector} ${position} ${volume} ${pitch} ${minVolume}`;
}
