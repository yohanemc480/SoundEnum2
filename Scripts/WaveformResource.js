import { SharedAudioPaths } from './ResourcePathProvider.js';

let loading;
export async function getWaveform(hash)
{
    loading ??= fetch(SharedAudioPaths.Waveforms).then(async response => {
        if (!response.ok) throw new Error('Waveforms unavailable');
        const data = await response.json();
        if (data.schemaVersion !== 1 || data.bins !== 256 || !data.waveforms) throw new Error('Invalid waveforms');
        return data.waveforms;
    }).catch(error => { loading = null; throw error; });
    const values = (await loading)[hash];
    if (!Array.isArray(values) || !values.length || values.length > 256 ||
        values.some(value => !Number.isInteger(value) || value < 0 || value > 255)) throw new Error('Missing/invalid waveform');
    return Float32Array.from(values, value => value / 255);
}
