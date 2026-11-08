/** サウンド情報のバージョンと参照先をまとめる。 */
export class SoundResourcePaths
{
    // 更新スクリプトが取得完了後に書き換える。
    static Version = "26.3";

    /** 同じ音声はバージョンをまたいで共通のファイルを使う。 */
    static Audio(hash)
    {
        return `resource/audio/${hash}.ogg`;
    }

    static get Hash()
    {
        return `resource/${this.Version}/audio-file-hashes.json`;
    }

    static get Sounds()
    {
        return `resource/${this.Version}/sound-events.json`;
    }

    static get Durations()
    {
        return `resource/audio-durations.json`;
    }

    static get Waveforms()
    {
        return `resource/audio-waveform-peaks.json`;
    }

    static get SearchTags()
    {
        return `resource/${this.Version}/audio-tags.json`;
    }
    static get SearchVectors()
    {
        return `resource/${this.Version}/audio-embeddings.bin`;
    }
}
