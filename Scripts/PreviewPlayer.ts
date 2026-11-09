import { playing as playingClass } from './Playback.css.ts';
import { Text } from "./Text.ts";
import { PreviewWaveform } from "./PreviewWaveform.ts";
/** 試聴中の音声と再生ボタン・シークバーを同期する。 */
export class PreviewPlayer
{
    constructor(audio: HTMLAudioElement)
    {
        const button = document.querySelector<HTMLButtonElement>('#preview-toggle');
        const seek = document.querySelector<HTMLInputElement>('#preview-seek');
        const canvas = document.querySelector<HTMLCanvasElement>('#preview-waveform');
        const time = document.querySelector<HTMLElement>('#preview-time');
        const soundId = document.querySelector<HTMLElement>('#preview-sound-id');
        const status = document.querySelector<HTMLElement>('#preview-status');
        const loading = document.querySelector<HTMLElement>('#preview-loading');
        if (!button || !seek || !canvas || !time || !soundId || !status || !loading) throw new Error('Missing preview player element');
        const waveform = new PreviewWaveform(audio, canvas);
        let dragging = false;
        let frame: number | null = null;
        const format = (seconds: number) => {
            const value = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
            return `${Math.floor(value / 60)}:${(value % 60).toFixed(1).padStart(4, '0')}`;
        };
        const update = () => {
            const currentSoundId = audio.dataset.soundId ?? '';
            if (soundId.textContent !== currentSoundId) {
                soundId.textContent = currentSoundId;
                soundId.title = currentSoundId;
            }
            const ready = Number.isFinite(audio.duration) && audio.duration > 0 && !audio.error;
            button.disabled = !audio.getAttribute('src') || !!audio.error;
            const playing = !audio.paused && !audio.ended;
            const label = playing ? Text.pause : Text.play;
            button.classList.toggle(playingClass, playing);
            button.setAttribute('aria-label', label);
            button.title = label;
            seek.disabled = !ready;
            seek.max = String(ready ? audio.duration : 0);
            if (!dragging) seek.value = String(ready ? audio.currentTime : 0);
            time.textContent = `${format(dragging ? Number(seek.value) : audio.currentTime)} / ${format(audio.duration)}`;
            seek.setAttribute('aria-valuetext', time.textContent);
            waveform.setProgress(ready ? Number(seek.value) / audio.duration : 0);
        };
        button.addEventListener('click', async () => {
            if (!audio.paused && !audio.ended) {
                audio.pause();
                return;
            }
            if (audio.ended) audio.currentTime = 0;
            try {
                await audio.play();
                status.textContent = '';
            } catch (error) {
                if (!(error instanceof Error) || error.name !== 'AbortError') status.textContent = Text.previewSelectAgain;
            }
            update();
        });
        // ドラッグ中はつまみを音声側の位置で上書きせず、確定時だけシークする。
        seek.addEventListener('pointerdown', () => { if (!seek.disabled) dragging = true; });
        seek.addEventListener('input', () => {
            dragging = true;
            update();
        });
        const commitSeek = () => {
            if (!dragging) return;
            const position = Number(seek.value);
            dragging = false;
            if (!seek.disabled) audio.currentTime = position;
            update();
        };
        seek.addEventListener('change', commitSeek);
        const cancelDrag = () => { dragging = false; update(); };
        seek.addEventListener('pointercancel', cancelDrag);
        seek.addEventListener('blur', cancelDrag);
        // change より先に pointerup が届いても、選択位置を確定する。
        window.addEventListener('pointerup', commitSeek);
        audio.addEventListener('emptied', cancelDrag);
        // 再生中は描画タイミングに合わせて位置を更新する。
        const animate = () => {
            frame = null;
            update();
            if (!audio.paused && !audio.ended) frame = requestAnimationFrame(animate);
        };
        audio.addEventListener('play', () => {
            if (frame === null) frame = requestAnimationFrame(animate);
        });
        const stopAnimation = () => {
            if (frame !== null) cancelAnimationFrame(frame);
            frame = null;
        };
        for (const event of ['pause', 'ended', 'emptied', 'error']) audio.addEventListener(event, stopAnimation);
        // 音声を切り替えても同じ要素を使い、停止中のシークでは再生しない。
        for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended', 'emptied', 'seeking', 'seeked']) {
            audio.addEventListener(event, update);
        }
        audio.addEventListener('loadstart', () => { status.textContent = ''; loading.hidden = false; update(); });
        audio.addEventListener('waiting', () => { loading.hidden = false; });
        for (const event of ['canplay', 'playing', 'error', 'previewerror', 'ended']) {
            audio.addEventListener(event, () => { loading.hidden = true; });
        }
        audio.addEventListener('canplay', () => { status.textContent = ''; update(); });
        audio.addEventListener('error', () => { status.textContent = Text.previewLoadFailure; update(); });
        audio.addEventListener('previewerror', () => { status.textContent = Text.previewRetry; update(); });
        update();
    }
}
