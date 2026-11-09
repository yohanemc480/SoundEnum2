import { parseSoundEvents } from './ResourceData.ts';
import type { SoundEntry } from './Model/Search/SearchTypes.ts';
import { resolveSoundEventReferences } from "./Model/Search/ResolveSoundEventReferences.ts";
import { ResourceBase } from "./ResourceBase.ts";

/**
 * command引数としてのsound名とraw_soundの対応付を行うクラス。
 * sound-events.jsonを読み取る。
 * 外部からリソースとして読み込みキャッシュしておき、staticにどこからでも対応付を確認できる。
 */
export class MCPlaysoundCommandParamResource extends ResourceBase
{
    _jsonData: Record<string, { sounds: SoundEntry[] }> = Object.create(null);

    constructor(rawResource: string)
    {
        super(rawResource);
    }

    /**
     * リソースをjson型に内部でフォーマットし、エイリアスを解決する。
     * 無骨だが、newしたすぐ後に呼ばないといけない。
     */
    ParseResource()
    {
        const events = parseSoundEvents(JSON.parse(this._rawResource));
        const resolved = resolveSoundEventReferences(events);
        this._jsonData = Object.fromEntries(Object.entries(events).map(([name, event]) => [name, { ...event, sounds: resolved[name] }]));
    }

    /**
     * コマンド名からサウンドのパラメータを取得する。
     * @param {*} soundCommandName "ambient.warped_forest.mood"みたいな形式
     * @returns [{"name":"~","type":"sounds",,},{},{},,,]
     */
    GetSoundParameters(soundCommandName: string)
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
    IsSoundCommandExist(soundCommandName: string)
    {
        let keys = Object.keys(this._jsonData);
        if (!keys.includes(soundCommandName))
        {
            return false;
        }
        return true;
    }
}
