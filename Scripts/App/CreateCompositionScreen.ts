import { HtmlCompositionView } from '../View/Composition/HtmlCompositionView.ts';
import { CompositionPresenter } from '../Presenter/CompositionPresenter.ts';
import { BrowserCompositionPlayback } from '../Infrastructure/Audio/BrowserCompositionPlayback.ts';
import { LocalCompositionStore } from '../Infrastructure/Storage/LocalCompositionStore.ts';
import { getWaveform } from '../Infrastructure/Audio/WaveformResource.ts';
import { SharedAudioPaths } from '../ResourcePathProvider.ts';
import { CompositionModel } from '../Model/Composition/CompositionModel.ts';
import { Text } from '../I18n/Text.ts';
import { showToast } from '../View/Components/Toast/Toast.ts';
import type { AudioPlayback } from '../Contracts/Services/AudioPlayback.ts';
import type { CommandSettings } from '../Model/Command/CommandSettings.ts';
import type { SoundCommand } from '../FormatSoundCommand.ts';

/** 組み合わせのView・Presenter・音声・保存を組み立て、画面間の接続を受け取る。 */
export function createCompositionScreen(previewPlayback: AudioPlayback, settings: CommandSettings,
    selectPreview: (button: HTMLButtonElement) => void, preview: (row: SoundCommand) => void | Promise<void>, similar: (name: string) => void) {
    const volume = previewPlayback.read().masterVolume;
    const view = new HtmlCompositionView(volume, selectPreview);
    const playback = new BrowserCompositionPlayback(SharedAudioPaths.Audio, volume);
    const presenter = new CompositionPresenter(view, new LocalCompositionStore(), playback, previewPlayback, settings,
        { load: getWaveform }, { preview, similar, notify: message => showToast(message === 'added' ? Text.compositionAdded :
            message === 'limit' ? Text.compositionLimit(CompositionModel.MaxSounds) : Text.compositionFailure) });
    const lifecycle = new AbortController();
    window.addEventListener('pagehide', () => presenter.stop(), { signal: lifecycle.signal });
    return { presenter, view, dispose: () => { lifecycle.abort(); presenter.dispose(); view.dispose(); playback.dispose(); } };
}
