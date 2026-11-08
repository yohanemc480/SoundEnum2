import { initializeVersionSelector } from './VersionSelector.js';
import { applyText } from "./ApplyText.js";
import { Text } from "./Text.js";
import { PreviewPlayer } from "./PreviewPlayer.js";
import { initializeBrowserTabs } from "./BrowserTabs.js";
import { SoundSearchBrowser } from "./SoundSearchBrowser.js";
console.log("main.jsの読み込みを始めました");
import { SoundGenreTree } from "./SoundGenreTree.js";
import { MCSoundHashResource } from "./MCSoundHashResource.js";
import { MCPlaysoundCommandParamResource } from "./MCPlaysoundCommandParamResource.js";
import { NetworkFileLoader } from "./NetworkFileLoader.js";
import { ResourcePathProvider } from "./ResourcePathProvider.js";
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



applyText();
const paths = new ResourcePathProvider(await initializeVersionSelector());

// リソースの読み込み
const soundHashResource = await new MCSoundHashResource(
    await new NetworkFileLoader(paths.Hash).FetchData()
)

const playsoundCommandParamResouce = await new MCPlaysoundCommandParamResource(
    await new NetworkFileLoader(paths.Sounds).FetchData()
)

soundHashResource.ParseResource();
playsoundCommandParamResouce.ParseResource();

new ResourceManager(playsoundCommandParamResouce, soundHashResource);
new SoundManager();
new PreviewPlayer(SoundManager.Instance.GetAudio());
new HistoryManager();

let outputArea = new OutputArea(".output", Text.commandOutput);

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
initializeBrowserTabs();
const searchBrowser = new SoundSearchBrowser(outputArea, paths);
searchBrowser.load();
