import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeComposition } from '../Scripts/Model/Composition/CompositionData.ts';
import { normalizePreferences } from '../Scripts/Model/Search/SearchPreferences.ts';
import { BrowserCompositionPlayback } from '../Scripts/Infrastructure/Audio/BrowserCompositionPlayback.ts';

/** 音声時計と音源の記録だけを持つブラウザAPIの代替。 */
function audioFixture(t) {
    const sources = [], gains = [], frames = new Map();
    let nextFrame = 0, requests = 0, closed = 0;
    const originalFrame = globalThis.requestAnimationFrame, originalCancel = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
    globalThis.cancelAnimationFrame = id => frames.delete(id);
    t.after(() => {
        playback.dispose();
        if (originalFrame === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = originalFrame;
        if (originalCancel === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = originalCancel;
    });
    const context = {
        currentTime: 10, async resume() {}, async close() { closed++; }, async decodeAudioData() { return { duration: 3 }; },
        createBufferSource() {
            const source = { playbackRate: {}, connect() {}, disconnect() { this.disconnected = true; },
                start(time) { this.time = time; }, stop() { this.stopped = true; } };
            sources.push(source); return source;
        },
        createGain() { const gain = { gain: {}, connect() {}, disconnect() { this.disconnected = true; } }; gains.push(gain); return gain; },
    };
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => { requests++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) }; });
    const playback = new BrowserCompositionPlayback(hash => `audio/${hash}`, .8, () => context);
    const row = { name: 'a', source: 'master', minVolume: 0, volume: 1, pitch: 1,
        candidate: { hash: 'hash', weight: 1, pitch: .75, volume: .5, duration: 4 } };
    return { playback, context, sources, gains, frames, fetchMock, rows: [row, { ...row, volume: .5, pitch: 2 }],
        requests: () => requests, closed: () => closed };
}

test('全音源の準備後に同時再生し、音量・再生時間・解放処理を維持する', async t => {
    const f = audioFixture(t);
    await f.playback.play(f.rows);
    assert.equal(f.requests(), 1);
    assert.deepEqual(f.sources.map(source => source.time), [10.05, 10.05]);
    assert.deepEqual(f.sources.map(source => source.playbackRate.value), [.75, 1.5]);
    assert.deepEqual(f.gains.map(gain => gain.gain.value), [.4, .2]);
    assert.equal(f.playback.read().duration, 4);
    f.playback.setVolume(.4);
    assert.deepEqual(f.gains.map(gain => gain.gain.value), [.2, .1]);
    f.context.currentTime = 11.05;
    const [id, tick] = f.frames.entries().next().value; f.frames.delete(id); tick();
    assert.equal(f.playback.read().currentTime, 1);
    f.playback.stop();
    assert.equal(f.playback.read().phase, 'idle');
    assert.ok(f.sources.every(source => source.stopped && source.disconnected));
    assert.ok(f.gains.every(gain => gain.disconnected));
    assert.equal(f.frames.size, 0);
    f.playback.dispose(); f.playback.dispose(); assert.equal(f.closed(), 1);
});

test('ダウンロード中の停止・破棄後は再生せず、通知の購読を解除する', async t => {
    const f = audioFixture(t); let finish;
    f.fetchMock.mock.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    let notifications = 0; const unsubscribe = f.playback.subscribe(() => notifications++);
    const pending = f.playback.play(f.rows); await Promise.resolve();
    f.playback.stop();
    finish({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }); await pending;
    assert.equal(f.sources.length, 0); assert.equal(f.playback.read().phase, 'idle');
    const pendingAgain = f.playback.play(f.rows); await Promise.resolve();
    unsubscribe(); const before = notifications; f.playback.dispose();
    finish({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }); await pendingAgain;
    assert.equal(f.sources.length, 0); assert.equal(notifications, before); assert.equal(f.frames.size, 0);
});

test('取得・デコード失敗を通知し、再生終了時に音量ノードと描画予約を解放する', async t => {
    const f = audioFixture(t);
    f.fetchMock.mock.mockImplementation(async () => ({ ok: false, status: 404 }));
    await f.playback.play(f.rows); assert.equal(f.playback.read().phase, 'error'); assert.equal(f.sources.length, 0);
    f.fetchMock.mock.mockImplementation(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }));
    const decode = t.mock.method(f.context, 'decodeAudioData', async () => { throw new Error('decode'); });
    await f.playback.play(f.rows); assert.equal(f.playback.read().phase, 'error');
    decode.mock.restore(); await f.playback.play(f.rows);
    f.sources[0].onended(); assert.equal(f.playback.read().phase, 'playing');
    f.sources[1].onended(); assert.equal(f.playback.read().phase, 'idle');
    assert.equal(f.playback.read().currentTime, 4); assert.equal(f.frames.size, 0);
    assert.ok(f.gains.every(gain => gain.disconnected));
});

test('新しい組み合わせの再生後に古いデコード結果で再生しない', async t => {
    const f = audioFixture(t); let finishDecode;
    const decode = t.mock.method(f.context, 'decodeAudioData', () => new Promise(resolve => { finishDecode = resolve; }));
    const oldPlay = f.playback.play(f.rows);
    await new Promise(resolve => setImmediate(resolve));
    decode.mock.restore();
    await f.playback.play([{ ...f.rows[0], name: 'new' }]);
    finishDecode({ duration: 100 }); await oldPlay;
    assert.equal(f.sources.length, 1);
    assert.equal(f.playback.read().rows[0].name, 'new'); assert.equal(f.playback.read().duration, 4);
});

test('音声処理の再開待ちで停止した場合は音源取得を開始しない', async t => {
    const f = audioFixture(t); let finishResume;
    t.mock.method(f.context, 'resume', () => new Promise(resolve => { finishResume = resolve; }));
    const pending = f.playback.play(f.rows); f.playback.stop(); finishResume(); await pending;
    assert.equal(f.requests(), 0); assert.equal(f.sources.length, 0);
});

test('組み合わせの重複と数値精度を保持し、不正な設定を拒否する', () => {
    const row = { name: 'a', source: 'block', volume: 2.3, pitch: .75, minVolume: .35 };
    assert.deepEqual(normalizeComposition([row, row]), [row, row]);
    for (const patch of [{ pitch: 0 }, { volume: NaN }, { source: 'invalid' }, { minVolume: -1 }, { minVolume: 1.1 }, { minVolume: NaN }])
        assert.throws(() => normalizeComposition([{ ...row, ...patch }]));
    assert.deepEqual(normalizeComposition([{ ...row, start: 12 }]), [row]);
    const { source, minVolume, ...legacy } = row;
    assert.deepEqual(normalizeComposition([legacy]), [{ ...legacy, source: 'master', minVolume: 0 }]);
    assert.equal(normalizePreferences({ tab: 'composition-tab' }).tab, 'search-tab');
});
