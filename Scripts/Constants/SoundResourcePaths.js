/** サウンド情報のバージョンと参照先をまとめる。 */
export class SoundResourcePaths
{
    // 更新スクリプトが取得完了後に書き換える。
    static Version = "26.3";

    static get Hash()
    {
        return `resource/${this.Version}hash.json`;
    }

    static get Sounds()
    {
        return `resource/${this.Version}sounds.json`;
    }
}
