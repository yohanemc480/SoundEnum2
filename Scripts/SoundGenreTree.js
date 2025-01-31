import { SoundGenreNode } from "./SoundGenreNode.js";

/**
 * ジャンル選択する木構造を表現するクラス
 */
export class SoundGenreTree
{
    _rootNode = null;
    /**
     * コンストラクタ
     * @param {*} soundNames ["entity.ender...","entity.chicken..."]
     */
    constructor(soundNames)
    {
        this._rootNode = new SoundGenreNode(null, "");
        for (let i = 0; i < soundNames.length; i++)
        {
            this._rootNode.AddChildNode(soundNames[i]);
        }
    }

    /**
     * ルートノードを取得する。
     * @returns
     */
    GetRoot()
    {
        return this._rootNode;
    }
}