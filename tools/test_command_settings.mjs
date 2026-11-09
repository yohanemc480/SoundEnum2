import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundManager } from '../Scripts/Singletons/SoundManager.ts';
import { normalizeCommandSettings } from '../Scripts/LocalStorageSchema.ts';

test('command settings restore and persist precise values across instances', () => {
    let saved = JSON.stringify({ source: 'block', volume: 3.25, pitch: 1.23, minVolume: .37 });
    globalThis.localStorage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
    globalThis.Audio = class {};
    try {
        const manager = new SoundManager();
        assert.equal(manager.GetSource(), 'block');
        assert.equal(manager.GetVolume(), 3.25);
        assert.equal(manager.GetPitch(), 1.23);
        assert.equal(manager.GetMinVolume(), .37);
        manager.SetSource('ambient');
        manager.SetVolume(5.67);
        manager.SetPitch(.89);
        manager.SetMinVolume(.12);
        assert.deepEqual(JSON.parse(saved), { source: 'ambient', volume: 5.67, pitch: .89, minVolume: .12 });
    } finally { delete globalThis.localStorage; delete globalThis.Audio; }
});

test('command settings reject invalid values and clamp bounded controls', () => {
    assert.deepEqual(normalizeCommandSettings({ source: 'invalid', volume: Infinity, pitch: 9, minVolume: -1 }),
        { source: 'master', volume: 1, pitch: 2, minVolume: 0 });
});
