import type { AudioPlayback, AudioPlaybackState } from '../Contracts/Services/AudioPlayback.ts';
import type { PlaybackResources, WaveformSource } from '../Contracts/Services/PlaybackResources.ts';
import type { PlaybackView } from '../Contracts/Views/PlaybackView.ts';
import type { SoundPreviewRequest, SoundPreviewService } from '../Contracts/Services/SoundPreviewService.ts';
import { CommandSettings } from '../Model/Command/CommandSettings.ts';
import { selectWeightedCandidate } from '../Model/Playback/SelectWeightedCandidate.ts';
import { formatSoundCommand } from '../Model/Command/FormatSoundCommand.ts';

/** 試聴候補・コマンド出力・再生操作・波形取得を調整し、音声要素は扱わない。 */
export class PlaybackPresenter implements SoundPreviewService {
    private readonly playback: AudioPlayback;
    private readonly view: PlaybackView;
    private readonly resources: PlaybackResources;
    private readonly waveforms: WaveformSource;
    private readonly settings: CommandSettings;
    private readonly output: (command: string) => void;
    private readonly cleanup: (() => void)[];
    private revision = -1;
    private disposed = false;
    constructor(playback: AudioPlayback, view: PlaybackView, resources: PlaybackResources, waveforms: WaveformSource,
        settings: CommandSettings, output: (command: string) => void) {
        this.playback = playback; this.view = view; this.resources = resources; this.waveforms = waveforms;
        this.settings = settings; this.output = output;
        this.cleanup = [view.bind({ toggle: () => { void this.toggle(); }, seek: seconds => playback.seek(seconds) }),
            playback.subscribe(state => this.update(state))];
    }
    /** 指定候補または重みに従う候補を選び、設定と候補の倍率を掛けて試聴する。 */
    async play(request: SoundPreviewRequest): Promise<void> {
        if (this.disposed) return;
        const candidate = request.candidate ?? selectWeightedCandidate(this.resources.candidates(request.name), value => value.weight);
        const command = { ...this.settings.read(), ...request.settings, name: request.name };
        this.output(formatSoundCommand(command));
        await this.playback.play({ soundName: request.name, hash: candidate.hash, url: this.resources.audioUrl(candidate.hash),
            pitch: command.pitch * candidate.pitch, volume: command.volume * candidate.volume });
    }
    /** プレイヤーのマスター音量を再生サービスへ反映する。 */
    setMasterVolume(value: number): void { if (!this.disposed) this.playback.setMasterVolume(value); }
    /** 再生中は一時停止し、それ以外は選択済みの音を再開する。 */
    private async toggle(): Promise<void> {
        if (this.disposed) return;
        if (this.playback.read().playing) this.playback.pause(); else await this.playback.resume();
    }
    /** 音の再選択時に波形を消し、古い取得結果が新しい音の波形を上書きするのを防ぐ。 */
    private update(state: AudioPlaybackState): void {
        if (this.disposed) return;
        this.view.showState(state);
        if (state.revision === this.revision) return;
        this.revision = state.revision;
        this.view.showWaveform(null);
        if (state.hash) void this.loadWaveform(state.hash, state.revision);
    }
    /** 波形取得の失敗は表示だけに留め、試聴操作を妨げない。 */
    private async loadWaveform(hash: string, revision: number): Promise<void> {
        try {
            const peaks = await this.waveforms.load(hash);
            if (!this.disposed && revision === this.revision) this.view.showWaveform(peaks);
        } catch { /* 波形なしでも再生とシークを利用できる。 */ }
    }
    /** UIと再生状態の購読を解除する。サービス自体の破棄はAppが行う。 */
    dispose(): void { this.disposed = true; this.cleanup.forEach(dispose => dispose()); }
}
