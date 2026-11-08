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
        return `resource/${this.Version}hash.json`;
    }

    static get Sounds()
    {
        return `resource/${this.Version}sounds.json`;
    }

    static get Search()
    {
        return `resource/${this.Version}search.json`;
    }
}
