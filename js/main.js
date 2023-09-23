console.log("main.jsの読み込みを始めました");
import { SoundGenreNode, SoundGenreTree} from "./genre.js";
import {MCSoundHashResource ,MCPlaysoundCommandParamResource, NetworkFileLoader} from "./resource.js";
import { GenreButton, GenreButtonGenerator} from "./button.js";
import {test} from "./test.js";
import { SoundManager } from "./sound_manager.js";
import { OutputArea } from "./output_area.js";
import { SelectSourceArea } from "./select_source_area.js";
import { SelectSoundVolumeArea } from "./select_volume_area.js";

// リソースの読み込み
new MCSoundHashResource(
  await new NetworkFileLoader('https://raw.githubusercontent.com/yohanemc480/SoundEnum2/main/resource/1.20.1.json').FetchData()
).ParseResource();

new MCPlaysoundCommandParamResource(
  await new NetworkFileLoader('https://raw.githubusercontent.com/yohanemc480/SoundEnum2/main/resource/sounds.json').FetchData()
).ParseResource();

new SoundManager();
// test();
let outputArea = new OutputArea(".output","コマンド出力エリア");

let soundNames = MCPlaysoundCommandParamResource.GetAllCommandSoundName();
let tree = new SoundGenreTree(soundNames);
let root = tree.GetRoot();

// ソース選択ドロップダウンの追加
new SelectSourceArea("#select-source");
new SelectSoundVolumeArea("#select-sound-volume")

GenreButtonGenerator.GenerateButtonsFromNodes(root.GetChildren(), outputArea);
