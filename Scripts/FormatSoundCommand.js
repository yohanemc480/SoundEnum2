import { MCCommandSelector } from './Constants/MCCommandSelector.js';

export function formatSoundCommand({ name, source, volume, pitch, minVolume }, selector = MCCommandSelector.All, position = '~ ~ ~') {
    return `playsound minecraft:${name} ${source} ${selector} ${position} ${volume} ${pitch} ${minVolume}`;
}
