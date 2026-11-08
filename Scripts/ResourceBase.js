/**
 * リソースを読み込みためのベースクラス。
 */
export class ResourceBase
{
    _rawResource = null;
    constructor(rawResource)
    {
        this._rawResource = rawResource;
    }
}
