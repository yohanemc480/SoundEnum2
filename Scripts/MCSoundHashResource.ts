import { parseHashMap } from './ResourceData.ts';
import { ResourceBase } from "./ResourceBase.ts";

/**
 * raw_soundとhashの対応付を行うクラス。
 * indexes/{ver}.jsonを読み取る。
 * 外部からリソースとして読み込みキャッシュしておき、staticにどこからでも対応付を確認できる。
 */
export class MCSoundHashResource extends ResourceBase
{
    _jsonData: Record<string, string | undefined> = Object.create(null);

    constructor(rawResource: string)
    {
        super(rawResource);
    }

    /**
     * リソースをjson型に内部でフォーマットする。
     * 無骨だが、newしたすぐ後に呼ばないといけない。
     */
    ParseResource()
    {
        this._jsonData = parseHashMap(JSON.parse(this._rawResource));
    }

    /**
     * リソース名からハッシュ値に変換する。
     * @param {*} rawSoundResourceName "ambient/nether/warped_forest/here1" のような形式
     * @returns "abb0ffaa8df2bc05ba4b95457afa42ec67d785e8"
     */
    NameToHash(rawSoundResourceName: string)
    {
        // 存在しないリソースを渡されたらnullを返す。
        if (!this.IsSoundResourceExist(rawSoundResourceName))
        {
            Error(`${rawSoundResourceName}は存在しないリソースのためハッシュ値の取得に失敗しました。`)
        }
        let soundPath = this.NameToFullPath(rawSoundResourceName);
        return this._jsonData[soundPath];
    }

    /**
     * サウンドリソースが存在しているかどうか。
     * @param {*} rawSoundResourceName "ambient/nether/warped_forest/here1" のような形式
     * @returns bool
     */
    IsSoundResourceExist(rawSoundResourceName: string) {
        return Object.prototype.hasOwnProperty.call(
            this._jsonData, this.NameToFullPath(rawSoundResourceName));
    }

    /**
     * サウンドリソースの名前からハッシュ値を取得するためのフルパスに変換する。
     * @param {*} rawSoundResourceName "ambient/nether/warped_forest/here1" のような形式
     * @returns "minecraft/sounds/ambient/nether/warped_forest/here1.ogg"のような形式
     */
    NameToFullPath(rawSoundResourceName: string)
    {
        return `minecraft/sounds/${rawSoundResourceName}.ogg`
    }
}
