import { MCPlaysoundCommandParamResource, MCSoundHashResource } from "./resource.js";

/**
 * playsoundのコマンドで設定するsource
 */
const MCCommandSoundSource = Object.freeze({
  Master:"master",
  Music:"music",
  Record:"record",
  Weather:"weather",
  Block:"block",
  Hostile:"hostile",
  Neutral:"neutral",
  Player:"player",
  Ambient:"ambient",
  Voice:"voice",
})

/**
 * マイクラコマンドのセレクター
 */
const MCCommandSelector = Object.freeze({
  Executer:"@s",
  All:"@a",
  NearPlayer:"@p",
  Random:"@r",
  Entity:"@e",
})

/**
 * playsoundコマンドを打つときに指定する音を表すクラス
 * ambient.crimson_forest.mood
 */
class MCCommandSound {
  _soundName = "";
  _source = MCCommandSoundSource.master;
  _volume = 1;
  _pitch = 1;
  _minVolume = 1;
  _selector = MCCommandSelector.Executer;// いったん定数とする。
  _position = "~ ~ ~";// いったん定数とする。
  _rawSounds = [];

  constructor(soundName, source, selector, volume, pitch, minVolume, position = "~ ~ ~") {
    let rawSounds = MCPlaysoundCommandParamResource.GetSoundParameters(soundName);
    for (let i = 0; i < rawSounds.length; i++) {
      this._rawSounds.push(new MCRawSound(rawSounds[i]))
    }
    this._soundName = soundName;
    this._source = source;
    this._selector = selector;
    this._position = position;
    this._volume = volume;
    this._pitch = pitch;
    this._minVolume = minVolume;
  }

  GetPitch() {
    return this._pitch;
  }

  /**
   * マイクラ内で提供されるように、複数の音のなかからランダムで抽選した音を返す。
   */
  GetRawSoundRandomly() {
    var random = Math.floor( Math.random() * this._rawSounds.length );
    return this._rawSounds[random];
  }

  /**
   * コマンド用の文字列に変換する。
   * playsound ambient.cave master @p ~ ~ ~ 1 1 1
   */
  ToString() {
    return `playsound ${this._soundName} ${this._source} ${this._selector} ${this._position} ${this._volume} ${this._pitch} ${this._minVolume}`;
  }
}

/**
 * アセットとして存在しているサウンドを表すクラス。
 */
class MCRawSound {
  _volume = 1;
  _pitch = 1;
  _weight = 1;
  _soundLink = "";//サーバーから直接音源を DLできるリンク
  _rawSoundName = "";

  /**
   * @param {*} soundData {"name":"entity/player/attack/crit2","pitch":""}みたいな形式
   */
  constructor(soundData) {
    this._rawSoundName = soundData["name"];
    let keys = Object.keys(soundData);

    if (keys.includes("volume")) {
      this._volume = soundData["volume"];
    }
    if (keys.includes("pitch")) {
      this._pitch = soundData["pitch"];
    }
    if (keys.includes("weight")) {
      this.weight = soundData["weight"];
    }
  }

  GetPitch() {
    return this._pitch;
  }

  /**
   * リソースサーバーへのリンクを生成する。
   * @returns https://resources.download.minecraft.net/1f/1feb74db490a786a656387fc2ac8d682730228e2みたいな形式
   */
  CreateLink() {
    let hash = MCSoundHashResource.NameToHash(this._rawSoundName);
    return `https://resources.download.minecraft.net/${hash.slice(0,2)}/${hash}`;
  }
}



export {MCRawSound, MCCommandSound, MCCommandSoundSource, MCCommandSelector};