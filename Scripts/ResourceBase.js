import { SingletonBase } from "./SingletonBase.js";

/**
 * リソースを読み込みためのベースクラス。
 * 本当はここにシングルトンパターンを移植したいが、ジェネリクスがないのでわからない。
 */
export class ResourceBase extends SingletonBase
{
    _rawResource = null;
    constructor(rawResource)
    {
        super();
        this._rawResource = rawResource;
    }

    DebugPrint(start, end)
    {
        console.log(String(this._rawResource).slice(start, end));
    }
}