console.log("main.jsの読み込みを始めました");
import { SoundGenreTree } from "./SoundGenreTree.js";
import { MCSoundHashResource } from "./MCSoundHashResource.js";
import { MCPlaysoundCommandParamResource } from "./MCPlaysoundCommandParamResource.js";
import { NetworkFileLoader } from "./NetworkFileLoader.js";
import { GenreButtonGenerator } from "./GenreButtonGenerator.js";
import { SoundManager } from "./Singletons/SoundManager.js";
import { OutputArea } from "./OutputArea.js";
import { SelectSourceArea } from "./SelectSourceArea.js";
import { SelectVolumeArea } from "./SelectVolumeArea.js";
import { SelectPitchArea } from "./SelectPitchArea.js";
import { SelectMinVolumeArea } from "./SelectMinVolumeArea.js";
import { HistoryManager } from "./Singletons/HistoryManager.js";
import { SelectMasterVolumeArea } from "./SelectMasterVolumeArea.js";
import { ResourceManager } from "./Singletons/ResourceManager.js";



// リソースの読み込み
const soundHashResource = await new MCSoundHashResource(
    await new NetworkFileLoader('https://raw.githubusercontent.com/yohanemc480/SoundEnum2/main/resource/1.20.1.json').FetchData()
)

const playsoundCommandParamResouce = await new MCPlaysoundCommandParamResource(
    await new NetworkFileLoader('https://raw.githubusercontent.com/yohanemc480/SoundEnum2/main/resource/sounds.json').FetchData()
)

soundHashResource.ParseResource();
playsoundCommandParamResouce.ParseResource();

new ResourceManager(playsoundCommandParamResouce, soundHashResource);
new SoundManager();
new HistoryManager();

let outputArea = new OutputArea(".output", "コマンド出力エリア");

let soundNames = playsoundCommandParamResouce.GetAllCommandSoundName();
let tree = new SoundGenreTree(soundNames);
let root = tree.GetRoot();

// 各パラメータ選択エリアの追加
new SelectSourceArea("#select-source");
new SelectVolumeArea("#select-sound-volume");
new SelectPitchArea("#select-pitch");
new SelectMinVolumeArea("#select-min-volume");

GenreButtonGenerator.GenerateButtonsFromNodes(root.GetChildren(), outputArea);

new SelectMasterVolumeArea("#select-master-volume");