import { SavedCompositions } from './SavedCompositions.js';
import { SoundComposition } from './SoundComposition.js';
import { mountSoundSettings } from './SoundSettings.ts';
import { confirmAction } from './ConfirmDialog.ts';
import { localStorageStore } from './LocalStorage.ts';
import { initializeVersionSelector } from './VersionSelector.ts';
import { applyText } from "./ApplyText.ts";
import { Text } from "./Text.ts";
import { PreviewPlayer } from "./PreviewPlayer.js";
import { initializeBrowserTabs } from "./BrowserTabs.ts";
import { SoundSearchBrowser } from "./SoundSearchBrowser.js";
import { MCSoundHashResource } from "./MCSoundHashResource.ts";
import { MCPlaysoundCommandParamResource } from "./MCPlaysoundCommandParamResource.ts";
import { NetworkFileLoader } from "./NetworkFileLoader.ts";
import { ResourcePathProvider } from "./ResourcePathProvider.ts";
import { SoundManager } from "./Singletons/SoundManager.ts";
import { OutputArea } from "./OutputArea.js";
import { SelectMasterVolumeArea } from "./SelectMasterVolumeArea.ts";
import { ResourceManager } from "./Singletons/ResourceManager.ts";

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

let outputArea = new OutputArea(".output");

// 各パラメータ選択エリアの追加
mountSoundSettings(document.getElementById('command-settings'), {
    read: () => {
        const manager = SoundManager.Instance;
        return { source: manager.GetSource(), volume: manager.GetVolume(), pitch: manager.GetPitch(), minVolume: manager.GetMinVolume() };
    },
    save: value => {
        const manager = SoundManager.Instance;
        manager.SetSource(value.source);
        manager.SetVolume(value.volume);
        manager.SetPitch(value.pitch);
        manager.SetMinVolume(value.minVolume);
    },
});

new SelectMasterVolumeArea("#select-master-volume");
initializeBrowserTabs();
const composition = new SoundComposition({
    onPreview: (row, button) => searchBrowser.previewSound(row.name, null, button, row),
    onSimilar: name => searchBrowser.searchSimilar(name),
});
const searchBrowser = new SoundSearchBrowser(outputArea, paths, composition);
new SavedCompositions(composition, paths.Version);
searchBrowser.load();
