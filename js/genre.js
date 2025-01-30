/**
 * ジャンル選択する木構造を表現するクラス
 */
class SoundGenreTree {
    _rootNode = null;
    /**
     * コンストラクタ
     * @param {*} soundNames ["entity.ender...","entity.chicken..."]
     */
    constructor(soundNames) {
        this._rootNode = new SoundGenreNode(null, "");
        for (let i = 0; i < soundNames.length; i++) {
            this._rootNode.AddChildNode(soundNames[i]);
        }
    }

    /**
     * ルートノードを取得する。
     * @returns 
     */
    GetRoot() {
        return this._rootNode;
    }
}

/**
 * ジャンル選択する時の木構造の一つのノードを表現するクラス。
 */
class SoundGenreNode {
    _value = "";
    _parentNode = null;
    _childrenNode = [];
    _maxDepth = 3;

    constructor(parentNode, value) {
        this._parentNode = parentNode;
        this._value = value;
    }

    /**
     * 子要素にノードを追加する。
     * @param {*} name このノードのvalueを含まない子要素以下の名前
     */
    AddChildNode(name) {
        let topSection = this.GetFirstSectionFromName(name);
        // 追加するべき子要素はもうないので早期リターンする。
        if (topSection == "") {
            return;
        }
        // 深さが一定数以上になると結局表示しきれないので、それ以降の文字列を持つ一つのノードとして生成する。末端になるはずなので、早期リターンする。
        if (this.GetDepth() >= this._maxDepth - 1) {
            this._childrenNode.push(
                new SoundGenreNode(this, name)
            );
            return;
        }

        let childNode = this.GetChild(topSection)
        // 子要素が存在しなかったらまず生成する。
        if (childNode == null) {
            childNode = new SoundGenreNode(this, topSection)
            this._childrenNode.push(childNode);
        }
        // 子要素が必ず存在する状況になったので、子要素には孫要素を再起的に生成させる。
        let remainName = this.RemoveFirstSectionFromName(name);
        childNode.AddChildNode(remainName);
    }

    /**
     * このノードが表す値を取得する。
     * @returns 
     */
    GetValue() {
        return this._value;
    }

    /**
     * 親ノードを取得する。
     * @returns 
     */
    GetParentNode() {
        return this._parentNode;
    }

    /**
     * 子ノードを取得する。
     * @returns 
     */
    GetChildren() {
        return this._childrenNode;
    }

    /**
     * 子ノードを走査して指定したvalueを持つ子ノードを返す
     * 指定したvalueを持つ子ノードが存在しなかったらnullを返す
     * @param {*} name 
     * @returns 
     */
    GetChild(name) {
        for (let i = 0; i < this._childrenNode.length; i++) {
            if (this._childrenNode[i].GetValue() == name) {
                return this._childrenNode[i];
            }
        }
        return null;
    }
    /**
     * 最初に出てくる.以前の文字列を削除する。(.も込みで削除)
     * .が含まれなかったら空文字列を返す。
     * @param {*} name 
     */
    RemoveFirstSectionFromName(name) {
        // .が含まれなかったら全て消えるはずなので空文字列を返す。
        if (!name.includes('.')) {
            return '';
        }
        let deleteLastIndex = name.indexOf('.'); // 先頭から削除すべき最後の文字インデックス
        return name.slice(deleteLastIndex + 1);
    }

    /**
     * 最初に出てくる.以前の文字列を返す。
     * @param {*} name 
     * @returns 
     */
    GetFirstSectionFromName(name) {
        return name.split('.')[0];
    }

    /**
     * このノードが木構造の末端であるかどうか
     * @returns 
     */
    IsTreeEnd() {
        return this._childrenNode.length == 0;
    }

    /**
     * このノードが現在ルートノードから数えてどの深さにあるかを取得する。
     * ルートノードが0、一つ下を1とする。
     */
    GetDepth() {
        let parentNode = this._parentNode;
        let depth = 0;
        while (parentNode != null) {
            ++depth;
            parentNode = parentNode.GetParentNode();
        }
        return depth;
    }

    /**
     * ルートノードからこのノードへのパスを取得する。
     * これが実質的にサウンド名になる。
     */
    GetPath() {
        let values = [this._value];
        let parentNode = this.GetParentNode();
        while (parentNode != null) {
            if (parentNode.GetValue() != "") {
                values.unshift(parentNode.GetValue())
            }
            parentNode = parentNode.GetParentNode();
        }
        return values.join('.');
    }
}

export { SoundGenreNode, SoundGenreTree };