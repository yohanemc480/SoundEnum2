import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaybackPresenter } from '../Scripts/Presenter/PlaybackPresenter.ts';
import { CommandSettings } from '../Scripts/Model/Command/CommandSettings.ts';
import { SoundPlaybackResources } from '../Scripts/Infrastructure/Resources/SoundPlaybackResources.ts';

const candidate = { name: 'raw', hash: 'a', pitch: .5, volume: .5, weight: 1 };
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const flush = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };

test('playback presenter composes multipliers and commands and rejects stale waveform results', async () => {
    let state = { revision: 0, hash: '', playing: false }, listener, actions, command, request, seeks = [], pauses = 0;
    const peaks = [], loading = new Map(); let unsubscribed = false, unbound = false;
    const playback = {
        read: () => state,
        subscribe(callback) { listener = callback; listener(state); return () => { unsubscribed = true; }; },
        async play(value) { request = value; state = { ...state, hash: value.hash, revision: state.revision + 1 }; listener(state); },
        pause() { pauses++; }, async resume() { state.playing = true; }, seek(value) { seeks.push(value); },
        setMasterVolume(value) { state.masterVolume = value; },
    };
    const view = { bind(value) { actions = value; return () => { unbound = true; }; }, showState() {}, showWaveform(value) { peaks.push(value); } };
    const presenter = new PlaybackPresenter(playback, view, { candidates: () => [candidate], audioUrl: hash => `/audio/${hash}` },
        { load(hash) { const d = deferred(); loading.set(hash, d); return d.promise; } },
        new CommandSettings({ source: 'block', pitch: 2, volume: 3, minVolume: .2 }), value => { command = value; });
    await presenter.play({ name: 'event', candidate: null });
    assert.equal(request.pitch, 1); assert.equal(request.volume, 1.5); assert.equal(request.url, '/audio/a');
    assert.equal(command, 'playsound minecraft:event block @a ~ ~ ~ 3 2 0.2');
    await presenter.play({ name: 'other', candidate: { ...candidate, hash: 'b' }, settings: { source: 'music', volume: 1, pitch: 1, minVolume: 0 } });
    loading.get('b').resolve(new Float32Array([.8])); await flush();
    const latest = peaks.at(-1);
    loading.get('a').resolve(new Float32Array([.1])); await flush(); assert.equal(peaks.at(-1), latest);
    actions.toggle(); await flush(); actions.toggle(); assert.equal(pauses, 1);
    actions.seek(3); assert.deepEqual(seeks, [3]); presenter.setMasterVolume(.4); assert.equal(state.masterVolume, .4);
    await presenter.play({ name: 'late', candidate: { ...candidate, hash: 'c' } });
    presenter.dispose(); const count = peaks.length;
    loading.get('c').resolve(new Float32Array([1])); await flush();
    assert.equal(peaks.length, count); assert.equal(unsubscribed, true); assert.equal(unbound, true);
});

test('playback resource adapter resolves injected data and preserves candidate weights', () => {
    const hash = 'a'.repeat(40);
    const resources = new SoundPlaybackResources({ GetSoundParameters: () => [{ name: 'raw', pitch: .75, volume: .2, weight: 3 }] },
        { NameToHash: () => hash });
    assert.deepEqual(resources.candidates('event'), [{ name: 'raw', hash, pitch: .75, volume: .2, weight: 3 }]);
    assert.equal(resources.audioUrl(hash), `resource/audio/${hash}.ogg`);
    assert.throws(() => resources.audioUrl('invalid'), /Invalid/);
});
