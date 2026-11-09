import { DisposalScope } from './DisposalScope.ts';
import type { CopyText } from '../Contracts/Services/Clipboard.ts';
import { HtmlCompositionView } from '../View/Composition/HtmlCompositionView.ts';
import { CompositionPresenter } from '../Presenter/CompositionPresenter.ts';
import { BrowserCompositionPlayback } from '../Infrastructure/Audio/BrowserCompositionPlayback.ts';
import { LocalCompositionStore } from '../Infrastructure/Storage/LocalCompositionStore.ts';
import { getWaveform } from '../Infrastructure/Audio/WaveformResource.ts';
import { SharedAudioPaths } from '../Infrastructure/Resources/ResourcePathProvider.ts';
import { CompositionModel } from '../Model/Composition/CompositionModel.ts';
import { Text } from '../I18n/Text.ts';
import { showToast } from '../View/Components/Toast/Toast.ts';
import type { AudioPlayback } from '../Contracts/Services/AudioPlayback.ts';
import type { CommandSettings } from '../Model/Command/CommandSettings.ts';
import type { SoundCommand } from '../Model/Command/FormatSoundCommand.ts';

/** 組み合わせのView・Presenter・音声・保存を組み立て、画面間の接続を受け取る。 */
export function createCompositionScreen(previewPlayback: AudioPlayback, settings: CommandSettings,
    selectPreview: (button: HTMLButtonElement) => void, preview: (row: SoundCommand) => void | Promise<void>, similar: (name: string) => void, copyText: CopyText) {
    const scope = new DisposalScope();
    try {
        const volume = previewPlayback.read().masterVolume;
        const view = scope.own(new HtmlCompositionView(volume, selectPreview, copyText));
        const playback = scope.own(new BrowserCompositionPlayback(SharedAudioPaths.Audio, volume));
        const presenter = scope.own(new CompositionPresenter(view, new LocalCompositionStore(), playback, previewPlayback, settings,
            { load: getWaveform }, { preview, similar, notify: message => showToast(message === 'added' ? Text.compositionAdded :
                message === 'limit' ? Text.compositionLimit(CompositionModel.MaxSounds) : Text.compositionFailure) }));
        const lifecycle = new AbortController();
        scope.defer(() => lifecycle.abort());
        window.addEventListener('pagehide', () => presenter.stop(), { signal: lifecycle.signal });
        return { presenter, view, dispose: () => scope.dispose() };
    } catch (error) {
        try { scope.dispose(); } catch (cleanupError) { console.error(cleanupError); }
        throw error;
    }
}
