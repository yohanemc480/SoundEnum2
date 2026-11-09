import { createCommandCopier } from './CreateCommandCopier.ts';
import { LocalBrowserPreferencesStore } from '../Infrastructure/Storage/LocalBrowserPreferencesStore.ts';
import { BrowserAudioPlayback } from '../Infrastructure/Audio/BrowserAudioPlayback.ts';
import { SoundPlaybackResources } from '../Infrastructure/Resources/SoundPlaybackResources.ts';
import { LocalCommandSettingsStore } from '../Infrastructure/Storage/LocalCommandSettingsStore.ts';
import { CommandSettings } from '../Model/Command/CommandSettings.ts';
import { HtmlPlaybackView } from '../View/Playback/HtmlPlaybackView.ts';
import { PlaybackPresenter } from '../Presenter/PlaybackPresenter.ts';
import { getWaveform } from '../Infrastructure/Audio/WaveformResource.ts';
import { applyLayoutStyles } from '../View/Layout/ApplyLayoutStyles.ts';
import { applySearchStyles } from '../View/Search/ApplySearchStyles.ts';
import { applyPlaybackStyles } from '../View/Playback/ApplyPlaybackStyles.ts';
import { applySettingsStyles } from '../View/Settings/ApplySettingsStyles.ts';
import { createSavedCompositionsScreen } from './CreateSavedCompositionsScreen.ts';
import { createCompositionScreen } from './CreateCompositionScreen.ts';
import { mountSoundSettings } from './MountSoundSettings.ts';
import { confirmAction } from '../View/Components/ConfirmDialog/ConfirmDialog.ts';
import { localStorageStore } from '../Infrastructure/Storage/LocalStorage.ts';
import { createResourceVersionSelector } from './CreateResourceVersionSelector.ts';
import { applyText } from "../View/ApplyText.ts";
import { Text } from "../I18n/Text.ts";
import { createBrowserTabs } from './CreateBrowserTabs.ts';
import { createSearchScreen } from './CreateSearchScreen.ts';
import { MCSoundHashResource } from "../MCSoundHashResource.ts";
import { MCPlaysoundCommandParamResource } from "../MCPlaysoundCommandParamResource.ts";
import { fetchTextResource } from '../Infrastructure/Resources/FetchTextResource.ts';
import { DisposalScope } from './DisposalScope.ts';
import { ResourcePathProvider } from "../ResourcePathProvider.ts";
import { OutputArea } from "../View/Components/OutputArea/OutputArea.ts";
import { SelectMasterVolumeArea } from "../View/Components/VolumeControl/SelectMasterVolumeArea.ts";

/** 起動に必要な要素が存在することを確認する。 */
function requireElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing element: ${id}`);
    return element;
}

const scope = new DisposalScope();
const lifecycle = new AbortController();
scope.defer(() => lifecycle.abort());
/** 解放に失敗しても、元の起動エラーや他の終了処理を妨げない。 */
const dispose = () => { try { scope.dispose(); } catch (error) { console.error(error); } };
window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); }, { signal: lifecycle.signal });
if (import.meta.hot) import.meta.hot.dispose(dispose);

try {
    applyLayoutStyles();
    applySettingsStyles();
    applyPlaybackStyles();
    applySearchStyles();
    applyText();
    requireElement('clear-local-storage').addEventListener('click', async () => {
        if (!await confirmAction(Text.clearLocalStorageConfirm, { acceptLabel: Text.confirmDelete }) || lifecycle.signal.aborted) return;
        try {
            localStorageStore.clear();
            location.reload();
        } catch (error) {
            console.error(error);
            window.alert(Text.clearLocalStorageFailure);
        }
    }, { signal: lifecycle.signal });
    const browserPreferences = new LocalBrowserPreferencesStore();
    const versionSelector = scope.own(createResourceVersionSelector(browserPreferences));
    const version = await versionSelector.load();
    scope.throwIfDisposed();
    const paths = new ResourcePathProvider(version);
    const hashText = await fetchTextResource(paths.Hash, lifecycle.signal);
    scope.throwIfDisposed();
    const soundHashResource = new MCSoundHashResource(hashText);
    const soundText = await fetchTextResource(paths.Sounds, lifecycle.signal);
    scope.throwIfDisposed();
    const playsoundCommandParamResource = new MCPlaysoundCommandParamResource(soundText);

    soundHashResource.ParseResource();
    playsoundCommandParamResource.ParseResource();

    const playback = scope.own(new BrowserAudioPlayback());
    const commandSettings = new CommandSettings();
    const settingsStore = new LocalCommandSettingsStore();
    const playbackView = scope.own(new HtmlPlaybackView());
    const copyText = createCommandCopier();
    const outputArea = scope.own(new OutputArea('#preview-output', copyText));
    mountSoundSettings(requireElement('command-settings'), {
        model: commandSettings,
        read: () => settingsStore.read(), save: value => settingsStore.save(value),
    });
    const playbackPresenter = scope.own(new PlaybackPresenter(playback, playbackView,
        new SoundPlaybackResources(playsoundCommandParamResource, soundHashResource), { load: getWaveform },
        commandSettings, command => outputArea.SetText(command)));
    const masterVolumeControl = scope.own(new SelectMasterVolumeArea('#select-master-volume', {
        value: playback.read().masterVolume, onChange: value => playbackPresenter.setMasterVolume(value),
    }));
    const browserTabs = scope.own(createBrowserTabs(browserPreferences));
    const compositionScreen: ReturnType<typeof createCompositionScreen> = scope.own(createCompositionScreen(playback, commandSettings,
        button => searchScreen.view.selectPreviewButton(button),
        row => searchScreen.presenter.preview({ name: row.name, candidate: null, settings: row }),
        name => { void searchScreen.presenter.searchSimilar(name); }, copyText));
    const composition = compositionScreen.presenter;
    const searchScreen = scope.own(createSearchScreen(paths, composition, playbackPresenter, browserPreferences));
    const savedCompositionsScreen = scope.own(createSavedCompositionsScreen({
        read: () => ({ rows: composition.rows, soundNames: composition.events ? [...composition.events.keys()] : null }),
        subscribeChanges: listener => composition.subscribeChanges(listener),
        replace: rows => { if (!composition.save(rows)) return false; composition.render(); return true; },
    }, paths.Version, copyText));
    void searchScreen.presenter.load();

} catch (error) {
    dispose(); throw error;
}
