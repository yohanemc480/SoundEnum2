import test from 'node:test';
import assert from 'node:assert/strict';
import { SearchWaveforms } from '../Scripts/View/Search/SearchWaveforms.ts';

test('注入した取得元から波形を読み込み、削除済みCanvasへの結果を無視する', async t => {
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

test('再生とは独立して表示中の波形候補を順番に切り替える', () => {
    globalThis.document = { hidden: false };
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    try {
        const canvas = { clientWidth: 100, isConnected: true };
        const waves = Object.create(SearchWaveforms.prototype);
        waves.visible = new Set([canvas]);
        waves.items = new Map([[canvas, 'a']]);
        waves.rotation = new Map([[canvas, { hashes: ['a', 'b'] }]]);
        waves.displayed = new Map([[canvas, 'a']]);
        waves.fades = new Map();
        waves.holdUntil = new Map();
        waves.holdTimers = new Map();
        const queued = [];
        waves.enqueue = c => queued.push(c);
        waves.rotate();
        assert.equal(waves.items.get(canvas), 'b');
        waves.displayed.set(canvas, waves.items.get(canvas));
        waves.rotate();
        assert.equal(waves.items.get(canvas), 'a');
        document.hidden = true;
        waves.displayed.set(canvas, waves.items.get(canvas));
        waves.rotate();
        assert.equal(waves.items.get(canvas), 'a');
        assert.equal(queued.length, 2);
    } finally {
        delete globalThis.document;
        delete globalThis.window;
    }
});


test('候補変更時に前後の波形を重ねて描き、破棄時には描画予約を解除する', async t => {
    class Observer { observe() {} unobserve() {} disconnect() {} }
    const original = {
        IntersectionObserver: globalThis.IntersectionObserver, ResizeObserver: globalThis.ResizeObserver,
        document: globalThis.document, window: globalThis.window, requestAnimationFrame: globalThis.requestAnimationFrame,
        cancelAnimationFrame: globalThis.cancelAnimationFrame,
    };
    globalThis.IntersectionObserver = Observer; globalThis.ResizeObserver = Observer;
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    globalThis.document = { hidden: false };
    const frames = new Map();
    let id = 0;
    globalThis.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
    globalThis.cancelAnimationFrame = frame => frames.delete(frame);
    t.after(() => { for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    } });
    const canvas = { clientWidth: 100, isConnected: true };
    const waves = new SearchWaveforms({}, { load: async hash => new Float32Array([hash === 'a' ? .2 : .8]) });
    const drawings = [];
    waves.draw = (_, peaks, previous, progress) => drawings.push({ peaks, previous, progress });
    waves.visible.add(canvas);
    waves.items.set(canvas, 'a'); waves.queue.push(canvas); await waves.run();
    assert.equal(drawings.length, 1);
    assert.equal(frames.size, 0);
    waves.items.set(canvas, 'b'); waves.queue.push(canvas); await waves.run();
    assert.equal(drawings.length, 1);
    const [frameId, frame] = frames.entries().next().value;
    frames.delete(frameId);
    frame(performance.now() + 100);
    const blended = drawings.at(-1);
    assert.equal(blended.previous, drawings[0].peaks);
    assert.ok(blended.peaks[0] > blended.previous[0]);
    assert.ok(blended.progress > 0 && blended.progress < 1);
    const [nextId, next] = frames.entries().next().value;
    frames.delete(nextId);
    next(performance.now() + 400);
    assert.equal(drawings.at(-1).progress, 1);
    assert.equal(frames.size, 0);
    waves.items.set(canvas, 'a'); waves.queue.push(canvas); await waves.run();
    assert.equal(frames.size, 1);
    const pending = frames.values().next().value;
    waves.clear();
    assert.equal(frames.size, 0);
    pending(performance.now() + 100);
    assert.equal(drawings.length, 3);
});


test('400msの完全表示後に次候補を読み込み、400msのクロスフェード後も完全表示を保つ', async t => {
    class Observer { observe() {} unobserve() {} disconnect() {} }
    const original = {
        IntersectionObserver: globalThis.IntersectionObserver, ResizeObserver: globalThis.ResizeObserver,
        document: globalThis.document, window: globalThis.window,
        requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame,
        performance: globalThis.performance, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout,
    };
    let now = 0, id = 0, loaded;
    const frames = new Map(), timers = new Map(), drawings = [], calls = [];
    globalThis.IntersectionObserver = Observer; globalThis.ResizeObserver = Observer;
    globalThis.document = { hidden: false };
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    globalThis.performance = { now: () => now };
    globalThis.setTimeout = (callback, delay) => { timers.set(++id, { callback, delay }); return id; };
    globalThis.clearTimeout = key => timers.delete(key);
    globalThis.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
    globalThis.cancelAnimationFrame = key => frames.delete(key);
    t.after(() => { for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    } });
    const canvas = { clientWidth: 100, isConnected: true };
    const waves = new SearchWaveforms({}, { load: hash => {
        calls.push(hash);
        return new Promise(resolve => { loaded = resolve; });
    } });
    waves.draw = (_, peaks, previous, progress) => drawings.push({ peaks, previous, progress });
    waves.cache.set('a', new Float32Array([.2]));
    waves.rotation.set(canvas, { hashes: ['a', 'b'] });
    waves.visible.add(canvas); waves.items.set(canvas, 'a'); waves.queue.push(canvas);
    const pending = waves.run();
    assert.deepEqual(calls, []);
    const [holdId, hold] = timers.entries().next().value;
    assert.equal(hold.delay, 400);
    now = 400; timers.delete(holdId); hold.callback();
    assert.deepEqual(calls, ['b']);
    assert.equal(drawings.length, 1);
    assert.equal(frames.size, 0);
    waves.rotate();
    assert.equal(waves.items.get(canvas), 'b');
    loaded(new Float32Array([.8]));
    await pending;
    await Promise.resolve();
    assert.equal(frames.size, 1);
    /** 指定時刻の描画予約を1回進める。 */
    const tick = time => {
        now = time;
        const [key, frame] = frames.entries().next().value;
        frames.delete(key); frame(now);
    };
    tick(600);
    assert.equal(drawings.at(-1).progress, .5);
    tick(800);
    assert.equal(drawings.at(-1).progress, 1);
    assert.equal(waves.items.get(canvas), 'b');
    assert.equal(frames.size, 0);
    now = 1199;
    waves.rotate();
    assert.equal(waves.items.get(canvas), 'b');
    const [nextHoldId, nextHold] = timers.entries().next().value;
    assert.equal(nextHold.delay, 400);
    now = 1200; timers.delete(nextHoldId); nextHold.callback();
    assert.equal(waves.items.get(canvas), 'a');
    assert.equal(frames.size, 1);
    tick(1400);
    assert.equal(drawings.at(-1).progress, .5);
    assert.equal(drawings.at(-1).previous[0], Math.fround(.8));
    tick(1600);
    assert.equal(timers.size, 1);
    waves.clear();
    assert.equal(timers.size, 0);
});
