import { resolveSoundEvents } from "./ResolveSoundEvents.js";
import { ResourceBase } from "./ResourceBase.js";

/**
 * command引数としてのsound名とraw_soundの対応付を行うクラス。
 * sounds.jsonを読み取る。
 * 外部からリソースとして読み込みキャッシュしておき、staticにどこからでも対応付を確認できる。
 */
export class MCPlaysoundCommandParamResource extends ResourceBase
{
    constructor(rawResource)
    {
        super(rawResource);
    }

    /**
     * リソースをjson型に内部でフォーマットし、エイリアスを解決する。
     * 無骨だが、newしたすぐ後に呼ばないといけない。
     */
    ParseResource()
    {
        const events = JSON.parse(this._rawResource);
        const resolved = resolveSoundEvents(events);
        this._jsonData = Object.fromEntries(Object.entries(events).map(([name, event]) => [name, { ...event, sounds: resolved[name] }]));
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
        const events = JSON.parse(this._rawResource);
        const wrapper = '__soundenum_alias__';
        if (Object.hasOwn(events, wrapper)) throw new Error('Reserved alias key');
        return resolveSoundEvents({ ...events, [wrapper]: { sounds: [aliasSound] } })[wrapper];
    }

    /**
     * コマンド名からサウンドのパラメータを取得する。
     * @param {*} soundCommandName "ambient.warped_forest.mood"みたいな形式
     * @returns [{"name":"~","type":"sounds",,},{},{},,,]
     */
    GetSoundParameters(soundCommandName)
    {
        if (!this.IsSoundCommandExist(soundCommandName))
        {
            Error(`${soundCommandName}という名前のサウンドは存在していません。`);
        }
        let sounds = this._jsonData[soundCommandName]["sounds"];
        return sounds;
    }

    /**
     * 指定した名前のplaysoundコマンドが存在しているかを調べる。
     * @param {*} soundCommandName "ambient.warped_forest.mood"みたいな形式
     */
    IsSoundCommandExist(soundCommandName)
    {
        let keys = Object.keys(this._jsonData);
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
    GetAllCommandSoundName()
    {
        return Object.keys(this._jsonData);
    }
}
