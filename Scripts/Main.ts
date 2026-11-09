import { applyLayoutStyles } from './ApplyLayoutStyles.ts';
import { applySearchStyles } from './View/Search/ApplySearchStyles.ts';
import { applyPlaybackStyles } from './ApplyPlaybackStyles.ts';
import { applySettingsStyles } from './ApplySettingsStyles.ts';
import { SavedCompositions } from './SavedCompositions.ts';
import { SoundComposition } from './SoundComposition.ts';
import { mountSoundSettings } from './SoundSettings.ts';
import { confirmAction } from './ConfirmDialog.ts';
import { localStorageStore } from './LocalStorage.ts';
import { initializeVersionSelector } from './VersionSelector.ts';
import { applyText } from "./ApplyText.ts";
import { Text } from "./Text.ts";
import { PreviewPlayer } from "./PreviewPlayer.ts";
import { initializeBrowserTabs } from "./BrowserTabs.ts";
import { createSearchScreen } from './App/CreateSearchScreen.ts';
import { MCSoundHashResource } from "./MCSoundHashResource.ts";
import { MCPlaysoundCommandParamResource } from "./MCPlaysoundCommandParamResource.ts";
import { NetworkFileLoader } from "./NetworkFileLoader.ts";
import { ResourcePathProvider } from "./ResourcePathProvider.ts";
import { SoundManager } from "./Singletons/SoundManager.ts";
import { OutputArea } from "./OutputArea.ts";
import { SelectMasterVolumeArea } from "./SelectMasterVolumeArea.ts";
import { ResourceManager } from "./Singletons/ResourceManager.ts";

function requireElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing element: ${id}`);
    return element;
}

applyLayoutStyles();
applySettingsStyles();
applyPlaybackStyles();
applySearchStyles();
applyText();
requireElement('clear-local-storage').addEventListener('click', async () => {
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

let outputArea = new OutputArea("#preview-output");

// 各パラメータ選択エリアの追加
mountSoundSettings(requireElement('command-settings'), {
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
const composition: SoundComposition = new SoundComposition({
    onPreview: (row, button) => {
        searchScreen.view.selectPreviewButton(button);
        return searchScreen.presenter.preview({ name: row.name, candidate: null, settings: row });
    },
    onSimilar: name => { void searchScreen.presenter.searchSimilar(name); },
});
const searchScreen = createSearchScreen(paths, composition, outputArea);
new SavedCompositions(composition, paths.Version);
void searchScreen.presenter.load();
if (import.meta.hot) import.meta.hot.dispose(() => searchScreen.dispose());
