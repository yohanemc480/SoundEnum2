import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserAudioPlayback } from '../Scripts/Infrastructure/Audio/BrowserAudioPlayback.ts';
import { SoundPlaybackResources } from '../Scripts/Infrastructure/Resources/SoundPlaybackResources.ts';
class FakeAudio extends EventTarget {
    paused = true; ended = false; duration = NaN; currentTime = 0; plays = 0; src = '';
    pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
    load() { this.duration = NaN; this.currentTime = 0; }
    removeAttribute() { this.src = ''; }
    play() { this.plays++; this.duration = 10; this.paused = false; this.dispatchEvent(new Event('play')); return Promise.resolve(); }
}
const request = { soundName: 'event', hash: 'a', url: '/audio', pitch: 1, volume: 1.5 };

test('音量・ピッチを維持し、古い取得結果を無視してエラーを通知する', async () => {
    const previous = { fetch: globalThis.fetch, requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame };
    const requests = []; const audio = new FakeAudio();
    globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
    globalThis.fetch = (url, options) => new Promise(resolve => requests.push({ url, options, resolve }));
    const playback = new BrowserAudioPlayback(audio);
    try {
        playback.setMasterVolume(.8);
        const oldPlay = playback.play(request), newPlay = playback.play(request);
        assert.equal(requests[0].options.signal.aborted, true);
        requests[1].resolve(new Response(new Blob(['audio']))); await newPlay;
        assert.equal(audio.playbackRate, 1); assert.equal(audio.volume, 1); assert.equal(audio.plays, 1);
        const currentUrl = audio.src;
        requests[0].resolve(new Response(new Blob(['old']))); await oldPlay;
        assert.equal(audio.src, currentUrl); assert.equal(audio.plays, 1);
        playback.pause(); playback.seek(4);
        assert.equal(audio.currentTime, 4); assert.equal(audio.paused, true);
        await playback.resume(); assert.equal(audio.plays, 2);
        playback.stop(); assert.equal(audio.currentTime, 0); assert.equal(audio.paused, true);
        const failed = playback.play(request); requests[2].resolve(new Response('', { status: 404 })); await failed;
        assert.equal(playback.read().error, 'load'); assert.equal(playback.read().loading, false);
    } finally { playback.dispose(); Object.assign(globalThis, previous); }
});

test('一時停止・破棄後は遅れて届いた音源を再生せず、生成したURLを解放する', async () => {
    const oldFetch = globalThis.fetch, oldRevoke = URL.revokeObjectURL;
    let finish; const revoked = []; const audio = new FakeAudio();
    globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
    URL.revokeObjectURL = url => { revoked.push(url); oldRevoke(url); };
    const playback = new BrowserAudioPlayback(audio);
    try {
        const pending = playback.play(request); playback.pause(); finish(new Response(new Blob(['late']))); await pending;
        assert.equal(audio.plays, 0);
        audio.play = async () => { throw new Error('not allowed'); };
        const next = playback.play(request); finish(new Response(new Blob(['audio']))); await next;
        assert.equal(playback.read().error, 'play');
        let updates = 0; const unsubscribe = playback.subscribe(() => updates++); unsubscribe();
        playback.dispose(); playback.dispose(); audio.dispatchEvent(new Event('timeupdate'));
        assert.equal(updates, 1); assert.equal(revoked.length, 1);
        const other = new BrowserAudioPlayback(new FakeAudio());
        const late = other.play(request); other.dispose(); finish(new Response(new Blob(['late']))); await late;
        assert.equal(revoked.length, 1);
    } finally { playback.dispose(); globalThis.fetch = oldFetch; URL.revokeObjectURL = oldRevoke; }
});

test('音源ハッシュがない場合は不正なURLを作る前に失敗する', () => {
    const resources = new SoundPlaybackResources({ event: { sounds: ['missing'] } }, {});
    assert.throws(() => resources.candidates('event'), /Missing audio hash/);
});
