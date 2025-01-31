import { ResourceBase } from "./ResourceBase.js";

/**
 * raw_soundとhashの対応付を行うクラス。
 * indexes/{ver}.jsonを読み取る。
 * 外部からリソースとして読み込みキャッシュしておき、staticにどこからでも対応付を確認できる。
 */
export class MCSoundHashResource extends ResourceBase
{
    constructor(rawResource)
    {
        super(rawResource);
    }

    /**
     * リソースをjson型に内部でフォーマットする。
     * 無骨だが、newしたすぐ後に呼ばないといけない。
     */
    ParseResource()
    {
        this._jsonData = JSON.parse(this._rawResource);
    }

    /**
     * リソース名からハッシュ値に変換する。
     * @param {*} rawSoundResourceName "ambient/nether/warped_forest/here1" のような形式
     * @returns "abb0ffaa8df2bc05ba4b95457afa42ec67d785e8"
     */
    NameToHash(rawSoundResourceName)
    {
        // 存在しないリソースを渡されたらnullを返す。
        if (!this.IsSoundResourceExist(rawSoundResourceName))
        {
            Error(`${rawSoundResourceName}は存在しないリソースのためハッシュ値の取得に失敗しました。`)
        }
        let soundPath = this.NameToFullPath(rawSoundResourceName);
        return this._jsonData["objects"][soundPath]["hash"];
    }

    /**
     * サウンドリソースが存在しているかどうか。
     * @param {*} rawSoundResourceName "ambient/nether/warped_forest/here1" のような形式
     * @returns bool
     */
    IsSoundResourceExist(rawSoundResourceName) {
        let keys = Object.keys(this._jsonData["objects"]);
        if (!keys.includes(this.NameToFullPath(rawSoundResourceName)))
        {
            return false;
        }
        return true;
    }

    /**
     * サウンドリソースの名前からハッシュ値を取得するためのフルパスに変換する。
     * @param {*} rawSoundResourceName "ambient/nether/warped_forest/here1" のような形式
     * @returns "minecraft/sounds/ambient/nether/warped_forest/here1.ogg"のような形式
     */
    NameToFullPath(rawSoundResourceName)
    {
        return `minecraft/sounds/${rawSoundResourceName}.ogg`
    }
}
