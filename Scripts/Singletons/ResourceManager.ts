import type { MCPlaysoundCommandParamResource } from '../MCPlaysoundCommandParamResource.ts';
import type { MCSoundHashResource } from '../MCSoundHashResource.ts';
import { SingletonBase } from "./SingletonBase.ts";

/**
 *  リソース管理のマネージャークラス
 */
export class ResourceManager extends SingletonBase
{
    declare static Instance: ResourceManager;
    _playsoundCommandParamResouce: MCPlaysoundCommandParamResource;
    _soundHashResource: MCSoundHashResource;

    constructor(playsoundCommandParamResouce: MCPlaysoundCommandParamResource, soundHashResource: MCSoundHashResource)
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