import test from 'node:test';
import assert from 'node:assert/strict';
import { SearchWaveforms } from '../Scripts/View/Search/SearchWaveforms.ts';

test('waveform loading uses the injected source and ignores results for removed canvases', async t => {
    class Observer { observe() {} unobserve() {} disconnect() {} }
    const original = { IntersectionObserver: globalThis.IntersectionObserver, ResizeObserver: globalThis.ResizeObserver };
    globalThis.IntersectionObserver = Observer; globalThis.ResizeObserver = Observer;
    t.after(() => { for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    } });
    let complete;
    const calls = [];
    const waves = new SearchWaveforms({}, { load: hash => {
        calls.push(hash); return new Promise(resolve => { complete = resolve; });
    } });
    const canvas = { clientWidth: 100, isConnected: true };
    const drawings = [];
    waves.draw = (target, peaks) => drawings.push({ target, peaks });
    waves.items.set(canvas, 'a'); waves.visible.add(canvas); waves.queue.push(canvas);
    const pending = waves.run();
    assert.deepEqual(calls, ['a']);
    waves.clear(); complete(new Float32Array([0.5])); await pending;
    assert.deepEqual(drawings, []);
    assert.equal(waves.running, false);
});

test('waveforms cycle visible candidates independently of playback', () => {
    globalThis.document = { hidden: false };
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    try {
        const canvas = { clientWidth: 100 };
        const waves = Object.create(SearchWaveforms.prototype);
        waves.visible = new Set([canvas]);
        waves.items = new Map([[canvas, 'a']]);
        waves.rotation = new Map([[canvas, { hashes: ['a', 'b'], next: 0 }]]);
        const queued = [];
        waves.enqueue = c => queued.push(c);
        waves.rotate();
        assert.equal(waves.items.get(canvas), 'b');
        waves.rotation.get(canvas).next = 0;
        waves.rotate();
        assert.equal(waves.items.get(canvas), 'a');
        document.hidden = true;
        waves.rotation.get(canvas).next = 0;
        waves.rotate();
        assert.equal(waves.items.get(canvas), 'a');
        assert.equal(queued.length, 2);
    } finally {
        delete globalThis.document;
        delete globalThis.window;
    }
});
