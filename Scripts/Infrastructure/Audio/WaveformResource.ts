import { SharedAudioPaths } from '../Resources/ResourcePathProvider.ts';

let loading: Promise<Record<string, unknown>> | null = null;
/** 波形ファイルを共有して取得し、指定音源の正規化済みピークを返す。失敗時は再試行できる。 */
export async function getWaveform(hash: string): Promise<Float32Array>
{
    loading ??= fetch(SharedAudioPaths.Waveforms, { cache: 'no-cache' }).then(async response => {
        if (!response.ok) throw new Error('Waveforms unavailable');
        const data: unknown = await response.json();
        if (!isRecord(data) || data.schemaVersion !== 1 || data.bins !== 256 || !isRecord(data.waveforms)) throw new Error('Invalid waveforms');
        return data.waveforms;
    }).catch(error => { loading = null; throw error; });
    const values = (await loading)[hash];
    if (!Array.isArray(values) || !values.length || values.length > 256 ||
        values.some((value: unknown) => typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255)) throw new Error('Missing/invalid waveform');
    return Float32Array.from(values, value => value / 255);
}

/** 外部JSONが配列以外のオブジェクトかを判定する。 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
