/** 試聴中の音声と再生ボタン・シークバーを同期する。 */
export class PreviewPlayer
{
    constructor(audio)
    {
        const button = document.querySelector('#preview-toggle');
        const seek = document.querySelector('#preview-seek');
        const time = document.querySelector('#preview-time');
        const status = document.querySelector('#preview-status');
        let dragging = false;
        let frame = null;
        const format = seconds => {
            const value = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
            return `${Math.floor(value / 60)}:${(value % 60).toFixed(1).padStart(4, '0')}`;
        };
        const update = () => {
            const ready = Number.isFinite(audio.duration) && audio.duration > 0 && !audio.error;
            button.disabled = !audio.getAttribute('src') || !!audio.error;
            const playing = !audio.paused && !audio.ended;
            const label = playing ? '一時停止' : '再生';
            button.classList.toggle('is-playing', playing);
            button.setAttribute('aria-label', label);
            button.title = label;
            seek.disabled = !ready;
            seek.max = ready ? audio.duration : 0;
            if (!dragging) seek.value = ready ? audio.currentTime : 0;
            time.textContent = `${format(dragging ? Number(seek.value) : audio.currentTime)} / ${format(audio.duration)}`;
            seek.setAttribute('aria-valuetext', time.textContent);
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
                if (error.name !== 'AbortError') status.textContent = '再生できませんでした。音声を選び直してください。';
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
        audio.addEventListener('loadstart', () => { status.textContent = '読み込み中…'; update(); });
        audio.addEventListener('canplay', () => { status.textContent = ''; update(); });
        audio.addEventListener('error', () => { status.textContent = '音声を読み込めませんでした。'; update(); });
        audio.addEventListener('previewerror', () => { status.textContent = '再生できませんでした。再生ボタンで再試行してください。'; update(); });
        update();
    }
}
