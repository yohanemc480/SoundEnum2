import { ResourceBase } from "./ResourceBase.js";

/**
 * command引数としてのsound名とraw_soundの対応付を行うクラス。
 * sounds.jsonを読み取る。
 * 外部からリソースとして読み込みキャッシュしておき、staticにどこからでも対応付を確認できる。
 */
export class MCPlaysoundCommandParamResource extends ResourceBase
{
    static Instance = null;
    constructor(rawResource)
    {
        if (MCPlaysoundCommandParamResource.Instance)
        {
            return MCPlaysoundCommandParamResource.Instance;
        }
        super(rawResource);
        MCPlaysoundCommandParamResource.Instance = this;
    }

    /**
     * リソースをjson型に内部でフォーマットし、エイリアスを解決する。
     * 無骨だが、newしたすぐ後に呼ばないといけない。
     */
    ParseResource()
    {
        this._jsonData = JSON.parse(this._rawResource);

        let soundCommandNames = Object.keys(this._jsonData);
        // soundsがstringの配列の場合を解決する。
        // 全てcompoundでラップしてあげる。
        for (let i = 0; i < soundCommandNames.length; i++)
        {
            let soundCommandName = soundCommandNames[i];
            let sounds = this._jsonData[soundCommandName]["sounds"];
            for (let i = 0; i < sounds.length; i++)
            {
                let sound = sounds[i];
                if (typeof (sound) != "string")
                {
                    continue;
                }
                sounds[i] = { "name": sound };
            }
        }
        // soundのtype:"event"となっているものはほかのsoundsのエイリアスなのでここで解決してあげる。
        for (let i = 0; i < soundCommandNames.length; i++)
        {
            let resolvedSounds = [];
            let soundCommandName = soundCommandNames[i];
            let aliasSounds = this._jsonData[soundCommandName]["sounds"];
            // "type":"event"というkeyvalueがなかったら返す。
            for (let j = 0; j < aliasSounds.length; j++)
            {
                let aliasSound = aliasSounds[j];
                if (Object.keys(aliasSound).includes("type") && aliasSound["type"] == "event")
                {
                    resolvedSounds.push(...this.ResolveAliasSound(aliasSound));
                }
                else
                {
                    resolvedSounds.push(aliasSound);
                }
            }
            this._jsonData[soundCommandName]["sounds"] = resolvedSounds;
        }
    }

    /**
     * エイリアス的に設定されているサウンドを解決する。
     * "hoge"というキー名のsoundsを探しに行くみたいな。
     * 解決先もcompoundであることが前提になっている。
     * @param {*} aliasSound {"name":"hoge","type":"event"}みたいな形式
     * @returns [{"name":"~","type":"sounds",,},{},{},,,]
     */
    ResolveAliasSound(aliasSound)
    {
        let aliasSoundName = aliasSound["name"];

        let resultSounds = [];
        // エイリアス先のsounds
        let resolveSounds = this._jsonData[aliasSoundName]["sounds"];
        for (let i = 0; i < resolveSounds.length; i++)
        {
            //エイリアス先にあるsoundsの数だけまずalias_soundを増やす。
            let resolvedSound = JSON.parse(JSON.stringify(aliasSound));
            resolvedSound["name"] = resolveSounds[i]["name"];
            resolvedSound["type"] = "sound";
            resultSounds.push(resolvedSound);
        }
        return resultSounds;
    }

    /**
     * コマンド名からサウンドのパラメータを取得する。
     * @param {*} soundCommandName "ambient.warped_forest.mood"みたいな形式
     * @returns [{"name":"~","type":"sounds",,},{},{},,,]
     */
    static GetSoundParameters(soundCommandName)
    {
        if (!this.IsSoundCommandExist(soundCommandName))
        {
            Error(`${soundCommandName}という名前のサウンドは存在していません。`);
        }
        let sounds = this.Instance._jsonData[soundCommandName]["sounds"];
        return sounds;
    }

    /**
     * 指定した名前のplaysoundコマンドが存在しているかを調べる。
     * @param {*} soundCommandName "ambient.warped_forest.mood"みたいな形式
     */
    static IsSoundCommandExist(soundCommandName)
    {
        let keys = Object.keys(MCPlaysoundCommandParamResource.Instance._jsonData);
        if (!keys.includes(soundCommandName))
        {
            return false;
        }
        return true;
    }

    /**
     * playsoundの全サウンド名を取得する。
     * @returns
     */
    static GetAllCommandSoundName()
    {
        return Object.keys(this.Instance._jsonData);
    }
}
