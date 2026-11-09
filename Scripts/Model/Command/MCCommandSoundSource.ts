/**
 * playsoundのコマンドで設定するsource
 */
export const MCCommandSoundSource = Object.freeze(
{
    Master: "master",
    Music: "music",
    Record: "record",
    Weather: "weather",
    Block: "block",
    Hostile: "hostile",
    Neutral: "neutral",
    Player: "player",
    Ambient: "ambient",
    Voice: "voice",
} as const);
/** playsoundで指定できる音源カテゴリ。 */
export type SoundSource = typeof MCCommandSoundSource[keyof typeof MCCommandSoundSource];
