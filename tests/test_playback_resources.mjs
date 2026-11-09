import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundPlaybackResources } from '../Scripts/Infrastructure/Resources/SoundPlaybackResources.ts';

const hash = 'a'.repeat(40);
const hashes = { 'minecraft/sounds/example.ogg': hash };

test('イベント参照を展開し、設定を合成して候補の既定値を保持する', () => {
    const resources = new SoundPlaybackResources({
        base: { sounds: ['minecraft:example', { name: 'example', pitch: 2, volume: 0, weight: 3 }] },
        alias: { sounds: [{ name: 'minecraft:base', type: 'event', pitch: 0.5, volume: 0.8, weight: 2 }] },
        empty: {},
    }, hashes);
    assert.deepEqual(resources.candidates('base')[0], { name: 'example', hash, pitch: 1, volume: 1, weight: 1 });
    assert.deepEqual(resources.candidates('alias'), [
        { name: 'example', hash, pitch: 0.5, volume: 0.8, weight: 2 },
        { name: 'example', hash, pitch: 1, volume: 0, weight: 6 },
    ]);
    const changed = resources.candidates('base'); changed[0].pitch = 99;
    assert.equal(resources.candidates('base')[0].pitch, 1);
    assert.deepEqual(resources.candidates('empty'), []);
    assert.equal(resources.audioUrl(hash), `resource/audio/${hash}.ogg`);
    assert.throws(() => resources.audioUrl('../invalid'), /Invalid audio hash/);
    assert.throws(() => resources.candidates('toString'), /Missing sound event/);
});

test('生成時に不正なデータと壊れたイベント参照を拒否する', () => {
    assert.throws(() => new SoundPlaybackResources([], hashes), /Invalid sound events/);
    assert.throws(() => new SoundPlaybackResources({}, { example: 'invalid' }), /Invalid audio hash/);
    assert.throws(() => new SoundPlaybackResources({ event: { sounds: [{ name: 'missing', type: 'event' }] } }, hashes), /Missing sound event/);
    assert.throws(() => new SoundPlaybackResources({ event: { sounds: [{ name: 'event', type: 'event' }] } }, hashes), /Circular sound event/);
});
