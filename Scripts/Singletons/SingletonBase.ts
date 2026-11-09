/**
 * シングルトン
 */
export class SingletonBase
{
    static Instance: SingletonBase | undefined;

    constructor()
    {
        // 各派生クラスのコンストラクタに、独立した共有インスタンスを登録する。
        const owner = this.constructor as typeof SingletonBase;
        if (owner.Instance != null)
        {
            Error("既にシングルトンインスタンスが存在する");
        }
        owner.Instance = this;
    }
}