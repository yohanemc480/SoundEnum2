/**
 * シングルトン
 */
export class SingletonBase
{
    static Instance;

    constructor()
    {
        if (this.constructor.Instance != null)
        {
            Error("既にシングルトンインスタンスが存在する");
        }
        this.constructor.Instance = this;
    }
}