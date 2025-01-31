/**
 * リソースを読み込みためのベースクラス。
 * 本当はここにシングルトンパターンを移植したいが、ジェネリクスがないのでわからない。
 */
export class ResourceBase
{
    _rawResource = null;
    constructor(rawResource)
    {
        this._rawResource = rawResource;
    }

    DebugPrint(start, end)
    {
        console.log(String(this._rawResource).slice(start, end));
    }
}