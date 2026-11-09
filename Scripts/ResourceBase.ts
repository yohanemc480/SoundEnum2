/**
 * リソースを読み込みためのベースクラス。
 */
export class ResourceBase
{
    _rawResource: string;
    constructor(rawResource: string)
    {
        this._rawResource = rawResource;
    }
}
