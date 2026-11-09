import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeComposition, normalizePreferences } from '../Scripts/LocalStorageSchema.ts';
import { SoundComposition } from '../Scripts/SoundComposition.ts';

test('composition keeps duplicates and precision, rejecting invalid settings', () => {
    const row = { name: 'a', source: 'block', volume: 2.3, pitch: .75, minVolume: .35 };
    assert.deepEqual(normalizeComposition([row, row]), [row, row]);
    for (const patch of [{ pitch: 0 }, { volume: NaN }, { source: 'invalid' }, { minVolume: -1 }, { minVolume: 1.1 }, { minVolume: NaN }])
        assert.throws(() => normalizeComposition([{ ...row, ...patch }]));
    assert.deepEqual(normalizeComposition([{ ...row, start: 12 }]), [row]);
    const { source, minVolume, ...legacy } = row;
    assert.deepEqual(normalizeComposition([legacy]), [{ ...legacy, source: 'master', minVolume: 0 }]);
    assert.equal(normalizePreferences({ tab: 'composition-tab' }).tab, 'search-tab');
});

function fixture() {
    const ui = { play: { disabled: false, classList: { toggle() {} }, setAttribute() {} }, status: {}, loading: { hidden: true }, list: { querySelectorAll: () => [] } };
    const composition = Object.create(SoundComposition.prototype);
    Object.assign(composition, { rows: [{ name: 'a', volume: 1, pitch: 1 }, { name: 'a', volume: .5, pitch: 2 }],
        events: new Map([['a', { candidates: [{ hash: 'hash', weight: 1, pitch: .75, volume: .5 }] }]]),
        playback: { pause() {}, read: () => ({ masterVolume: .8 }) },
        generation: 0, nodes: new Set(), busy: false, element: id => ui[id] });
    return composition;
}

test('all buffers prepare before aligned playback; stop cancels scheduled sources', async () => {
    const oldAudio = globalThis.AudioContext, oldFetch = globalThis.fetch;
    const sources = [], gains = [];
    let requests = 0;
    globalThis.AudioContext = class {
        currentTime = 10;
        async resume() {}
        async decodeAudioData() { return {}; }
        createBufferSource() { const source = { playbackRate: {}, connect() {}, disconnect() {}, start(time) { this.time = time; }, stop() { this.stopped = true; } }; sources.push(source); return source; }
        createGain() { const gain = { gain: {}, connect() {}, disconnect() {} }; gains.push(gain); return gain; }
    };
    globalThis.fetch = async () => { requests++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) }; };

    try {
        const composition = fixture();
        await composition.play();
        assert.equal(requests, 1);
        assert.equal(composition.element('loading').hidden, true);
        assert.deepEqual(sources.map(s => s.time), [10.05, 10.05]);
        assert.deepEqual(sources.map(s => s.playbackRate.value), [.75, 1.5]);
        assert.deepEqual(gains.map(g => g.gain.value), [.4, .2]);
        composition.stop();
        assert.ok(sources.every(s => s.stopped));
        assert.equal(composition.busy, false);
        // 停止された読み込みは後から完了しても音を鳴らさない。
        let finish;
        globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
        const loading = composition.play();
        await Promise.resolve();
        assert.equal(composition.element('loading').hidden, false);
        assert.equal(composition.element('status').textContent, '');
        composition.stop();
        assert.equal(composition.element('loading').hidden, true);
        finish({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
        await loading;
        assert.equal(sources.length, 2);
    } finally { globalThis.AudioContext = oldAudio; globalThis.fetch = oldFetch;  }
});
