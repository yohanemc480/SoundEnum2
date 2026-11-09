/** サウンド情報のバージョンと参照先をまとめる。 */
export class ResourcePathProvider
{
    readonly Version: string;

    constructor(version: string)
    {
        if (typeof version !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(version)) throw new Error('Invalid resource version');
        this.Version = version;
        Object.freeze(this);
    }

    get Hash()
    {
        return `resource/${this.Version}/audio-file-hashes.json`;
    }

    get Sounds()
    {
        return `resource/${this.Version}/sound-events.json`;
    }

    get Durations()
    {
        return `resource/audio-durations.json`;
    }

    get SearchTags()
    {
        return `resource/${this.Version}/audio-tags.json`;
    }
    get SearchVectors()
    {
        return `resource/${this.Version}/audio-embeddings.bin`;
    }
}

/** バージョンに依存しない共有音声の配置。 */
export const SharedAudioPaths = Object.freeze({
    Audio: (hash: string) => `resource/audio/${hash}.ogg`,
    Waveforms: 'resource/audio-waveform-peaks.json'
});
