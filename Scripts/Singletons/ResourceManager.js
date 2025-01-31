import { SingletonBase } from "./SingletonBase.js";

/**
 *  リソース管理のマネージャークラス
 */
export class ResourceManager extends SingletonBase
{
    _playsoundCommandParamResouce;
    _soundHashResource;

    constructor(playsoundCommandParamResouce, soundHashResource)
    {
        super();
        this._playsoundCommandParamResouce = playsoundCommandParamResouce;
        this._soundHashResource = soundHashResource;
    }

    GetPlaysoundComandParamResource()
    {
        return this._playsoundCommandParamResouce;
    }

    GetSoundHashResouce()
    {
        return this._soundHashResource;
    }
}