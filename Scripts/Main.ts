import { BrowserAudioPlayback } from './Infrastructure/Audio/BrowserAudioPlayback.ts';
import { SoundPlaybackResources } from './Infrastructure/Resources/SoundPlaybackResources.ts';
import { LocalCommandSettingsStore } from './Infrastructure/Storage/LocalCommandSettingsStore.ts';
import { CommandSettings } from './Model/Command/CommandSettings.ts';
import { HtmlPlaybackView } from './View/Playback/HtmlPlaybackView.ts';
import { PlaybackPresenter } from './Presenter/PlaybackPresenter.ts';
import { getWaveform } from './Infrastructure/Audio/WaveformResource.ts';
import { applyLayoutStyles } from './ApplyLayoutStyles.ts';
import { applySearchStyles } from './View/Search/ApplySearchStyles.ts';
import { applyPlaybackStyles } from './ApplyPlaybackStyles.ts';
import { applySettingsStyles } from './ApplySettingsStyles.ts';
import { SavedCompositions } from './SavedCompositions.ts';
import { createCompositionScreen } from './App/CreateCompositionScreen.ts';
import { mountSoundSettings } from './App/MountSoundSettings.ts';
import { confirmAction } from './ConfirmDialog.ts';
import { localStorageStore } from './LocalStorage.ts';
import { initializeVersionSelector } from './VersionSelector.ts';
import { applyText } from "./ApplyText.ts";
import { Text } from "./Text.ts";
import { initializeBrowserTabs } from "./BrowserTabs.ts";
import { createSearchScreen } from './App/CreateSearchScreen.ts';
import { MCSoundHashResource } from "./MCSoundHashResource.ts";
import { MCPlaysoundCommandParamResource } from "./MCPlaysoundCommandParamResource.ts";
import { NetworkFileLoader } from "./NetworkFileLoader.ts";
import { ResourcePathProvider } from "./ResourcePathProvider.ts";
import { OutputArea } from "./OutputArea.ts";
import { SelectMasterVolumeArea } from "./SelectMasterVolumeArea.ts";

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

const playback = new BrowserAudioPlayback();
const commandSettings = new CommandSettings();
const settingsStore = new LocalCommandSettingsStore();
const playbackView = new HtmlPlaybackView();
const outputArea = new OutputArea('#preview-output');
mountSoundSettings(requireElement('command-settings'), {
    model: commandSettings,
    read: () => settingsStore.read(), save: value => settingsStore.save(value),
});
const playbackPresenter = new PlaybackPresenter(playback, playbackView,
    new SoundPlaybackResources(playsoundCommandParamResouce, soundHashResource), { load: getWaveform },
    commandSettings, command => outputArea.SetText(command));
const masterVolumeControl = new SelectMasterVolumeArea('#select-master-volume', {
    value: playback.read().masterVolume, onChange: value => playbackPresenter.setMasterVolume(value),
});
initializeBrowserTabs();
const compositionScreen = createCompositionScreen(playback, commandSettings,
    button => searchScreen.view.selectPreviewButton(button),
    row => searchScreen.presenter.preview({ name: row.name, candidate: null, settings: row }),
    name => { void searchScreen.presenter.searchSimilar(name); });
const composition = compositionScreen.presenter;
const searchScreen = createSearchScreen(paths, composition, playbackPresenter);
new SavedCompositions(composition, paths.Version);
void searchScreen.presenter.load();
/** アプリ終了時に購読・通信・音声の所有者を順に破棄する。 */
const dispose = () => { searchScreen.dispose(); compositionScreen.dispose(); playbackPresenter.dispose(); playbackView.dispose(); masterVolumeControl.dispose(); playback.dispose(); };
window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); });
if (import.meta.hot) import.meta.hot.dispose(dispose);
