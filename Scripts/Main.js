import { LocalStorageSchema } from './LocalStorageSchema.js';
import { confirmAction } from './ConfirmDialog.js';
import { localStorageStore } from './LocalStorage.js';
import { initializeVersionSelector } from './VersionSelector.js';
import { applyText } from "./ApplyText.js";
import { Text } from "./Text.js";
import { PreviewPlayer } from "./PreviewPlayer.js";
import { initializeBrowserTabs } from "./BrowserTabs.js";
import { SoundSearchBrowser } from "./SoundSearchBrowser.js";
console.log("main.jsの読み込みを始めました");
import { MCSoundHashResource } from "./MCSoundHashResource.js";
import { MCPlaysoundCommandParamResource } from "./MCPlaysoundCommandParamResource.js";
import { NetworkFileLoader } from "./NetworkFileLoader.js";
import { ResourcePathProvider } from "./ResourcePathProvider.js";
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
document.getElementById('clear-local-storage').addEventListener('click', async () => {
    if (!await confirmAction(Text.clearLocalStorageConfirm, { acceptLabel: Text.confirmDelete })) return;
    try {
        localStorageStore.clear();
        location.reload();
    } catch (error) {
        console.error(error);
        window.alert(Text.clearLocalStorageFailure);
    }
});
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

// 各パラメータ選択エリアの追加
const sourceArea = new SelectSourceArea("#select-source");
const volumeArea = new SelectVolumeArea("#select-sound-volume");
const pitchArea = new SelectPitchArea("#select-pitch");
const minVolumeArea = new SelectMinVolumeArea("#select-min-volume");
$(document).ready(() => {
    document.getElementById('reset-command-settings').addEventListener('click', () => {
        const defaults = LocalStorageSchema.CommandSettings.createDefault();
        sourceArea.OnUpdateValue(defaults.source);
        volumeArea.OnUpdateValue(String(defaults.volume));
        pitchArea.OnUpdateValue(String(defaults.pitch));
        minVolumeArea.OnUpdateValue(String(defaults.minVolume));
    });
});

new SelectMasterVolumeArea("#select-master-volume");
initializeBrowserTabs();
const searchBrowser = new SoundSearchBrowser(outputArea, paths);
searchBrowser.load();
