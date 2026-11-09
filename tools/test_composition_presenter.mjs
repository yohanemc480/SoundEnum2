import test from 'node:test';
import assert from 'node:assert/strict';
import { CompositionPresenter } from '../Scripts/Presenter/CompositionPresenter.ts';
import { CommandSettings } from '../Scripts/Model/Command/CommandSettings.ts';

const row = { name: 'a', source: 'block', volume: 1.25, pitch: .75, minVolume: .1 };
const candidate = { hash: 'one', pitch: 1, volume: .5, weight: 1, duration: 4 };

/** DOM・音声APIを用意せず、操作と表示の境界を記録する。 */
function fixture(options = {}) {
    let actions, displayed, rows, shownSettings, waveforms, audioListener, previewListener;
    let rowRenders = 0, notifications = [], pauses = 0, stops = 0, saved, writes = 0, revealed = 0;
    let state = { phase: 'idle', currentTime: 0, duration: 0, rows: [] };
    const calls = [];
    const audio = {
        read: () => state,
        subscribe: callback => { audioListener = callback; callback(state); return () => { audioListener = undefined; }; },
        play: async rows => { calls.push(rows); audio.emit({ phase: 'loading', rows }); },
        stop: () => { stops++; audio.emit({ phase: 'idle', currentTime: 0, duration: 0, rows: [] }); },
        setVolume: value => { calls.push(value); },
        emit: value => { state = { ...state, ...value }; audioListener?.(state); },
    };
    const view = {
        bind: value => { actions = value; return () => { actions = undefined; }; },
        showState: value => { displayed = value; }, showRows: value => { rows = value; rowRenders++; },
        showSettings: (index, value) => { shownSettings = { index, value }; }, showPlayback() {},
        showWaveform: (layers, duration) => { waveforms = { layers, duration }; }, revealAdded: () => { revealed++; },
    };
    const store = {
        read: () => { if (options.readFailure) throw new Error('corrupt'); return options.rows ?? [row]; },
        save: value => { writes++; if (options.writeFailure) throw new Error('quota'); saved = value; },
    };
    const preview = { subscribe: callback => { previewListener = callback; callback({ playing: false }); return () => { previewListener = undefined; }; }, pause: () => { pauses++; } };
    const presenter = new CompositionPresenter(view, store, audio, preview, new CommandSettings(),
        { load: hash => options.waveform ? options.waveform(hash) : Promise.resolve(new Float32Array([.5])) },
        { preview: value => calls.push(value), similar: value => calls.push(value), notify: value => notifications.push(value) });
    return { presenter, audio, options, calls,
        get actions() { return actions; }, get displayed() { return displayed; }, get rows() { return rows; },
        get shownSettings() { return shownSettings; }, get rowRenders() { return rowRenders; },
        get notifications() { return notifications; }, get pauses() { return pauses; }, get stops() { return stops; },
        get saved() { return saved; }, get writes() { return writes; }, get revealed() { return revealed; }, get waveforms() { return waveforms; },
        previewState: value => previewListener?.(value),
    };
}

test('composition presenter persists edits without rebuilding inputs and restores failed changes', () => {
    const f = fixture();
    assert.equal(f.displayed.loading, true);
    f.presenter.setEvents([{ name: 'a', candidates: [candidate] }]);
    assert.equal(f.displayed.canPlay, true);
    assert.match(f.displayed.command, /playsound minecraft:a block @a/);
    const renders = f.rowRenders;
    f.actions.settings(0, { ...row, pitch: 1.5 });
    assert.equal(f.presenter.rows[0].pitch, 1.5); assert.equal(f.saved[0].pitch, 1.5);
    assert.equal(f.rowRenders, renders);
    f.options.writeFailure = true;
    f.actions.settings(0, { ...row, pitch: 2 });
    assert.equal(f.presenter.rows[0].pitch, 1.5); assert.equal(f.shownSettings.value.pitch, 1.5);
    assert.equal(f.notifications.at(-1), 'failure');
    f.options.writeFailure = false;
    f.actions.preview(0); assert.equal(f.calls.at(-1).pitch, 1.5);
    f.actions.similar(0); assert.equal(f.calls.at(-1), 'a');
    f.presenter.add('a'); assert.equal(f.presenter.rows.length, 2); assert.equal(f.revealed, 1);
    f.actions.remove(0); assert.equal(f.presenter.rows.length, 1);
    f.presenter.dispose();
});

test('read failures prevent overwrites and row limits prevent additions', () => {
    const broken = fixture({ readFailure: true });
    assert.equal(broken.displayed.status, 'failure');
    assert.equal(broken.presenter.save([row]), false); assert.equal(broken.writes, 0);
    broken.presenter.dispose();
    const full = fixture({ rows: Array(10).fill(row) }); full.presenter.add('a');
    assert.equal(full.writes, 0); assert.equal(full.notifications.at(-1), 'limit'); full.presenter.dispose();
});

test('validity, availability, preparation and mutual playback stopping are coordinated by values', async () => {
    const f = fixture();
    await f.presenter.play(); assert.equal(f.calls.length, 0);
    f.presenter.setEvents([{ name: 'a', candidates: [candidate] }]);
    f.actions.validity(false); await f.presenter.play(); assert.equal(f.calls.length, 0);
    f.actions.validity(true); await f.presenter.play();
    assert.equal(f.displayed.busy, true); assert.equal(f.displayed.loading, true);
    f.audio.emit({ phase: 'playing', duration: 4 }); assert.equal(f.pauses, 1);
    f.audio.emit({ currentTime: 1 }); assert.equal(f.pauses, 1);
    f.previewState({ playing: true }); assert.equal(f.displayed.busy, false);
    const stops = f.stops; f.previewState({ playing: true }); assert.equal(f.stops, stops);
    f.audio.emit({ phase: 'error' }); assert.equal(f.displayed.status, 'failure');
    f.actions.volume(.2); assert.equal(f.calls.at(-1), .2);
    f.presenter.dispose(); assert.equal(f.actions, undefined);
    const afterDispose = f.stops; f.previewState({ playing: true }); assert.equal(f.stops, afterDispose);
});

test('out-of-order waveforms and disposal cannot overwrite the current composition', async () => {
    const pending = [];
    const f = fixture({ waveform: hash => new Promise(resolve => pending.push({ hash, resolve })) });
    f.presenter.setEvents([{ name: 'a', candidates: [candidate] }]);
    f.presenter.save([{ ...row, pitch: 1.5 }]);
    assert.equal(pending.length, 2);
    pending[1].resolve(new Float32Array([.75])); await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.waveforms.layers[0].duration, 4 / 1.5);
    pending[0].resolve(new Float32Array([.1])); await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.waveforms.layers[0].peaks[0], .75);
    f.presenter.render(); const current = f.waveforms; f.presenter.dispose();
    pending[2].resolve(new Float32Array([1])); await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.waveforms, current);
});

test('editor change subscriptions notify successful edits and resource loading, and can be detached', () => {
    const f = fixture(); let changes = 0;
    const unsubscribe = f.presenter.subscribeChanges(() => changes++);
    f.presenter.setEvents([{ name: 'a', candidates: [candidate] }]); assert.equal(changes, 1);
    f.presenter.save([{ ...row, pitch: 1.5 }]); assert.equal(changes, 2);
    f.options.writeFailure = true; f.presenter.save([]); assert.equal(changes, 2);
    unsubscribe(); f.presenter.setEvents([]); assert.equal(changes, 2);
    f.presenter.subscribeChanges(() => changes++); f.presenter.dispose();
    f.presenter.setEvents([]); assert.equal(changes, 2);
});


test('editor snapshots are isolated and replacement renders only after successful persistence', () => {
    const f = fixture();
    assert.equal(f.presenter.read().soundNames, null);
    f.presenter.setEvents([{ name: 'a', candidates: [candidate] }]);
    const snapshot = f.presenter.read();
    snapshot.rows[0].pitch = 2; snapshot.soundNames.length = 0;
    assert.equal(f.presenter.read().rows[0].pitch, row.pitch);
    assert.deepEqual(f.presenter.read().soundNames, ['a']);
    const renders = f.rowRenders;
    assert.equal(f.presenter.replace([{ ...row, pitch: 1.5 }]), true);
    assert.equal(f.rowRenders, renders + 1);
    assert.equal(f.rows[0].command.pitch, 1.5);
    f.options.writeFailure = true;
    assert.equal(f.presenter.replace([]), false);
    assert.equal(f.rowRenders, renders + 1);
    assert.equal(f.presenter.read().rows.length, 1);
    f.presenter.dispose();
    assert.equal(f.presenter.replace([]), false);
});
