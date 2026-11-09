import test from 'node:test';
import assert from 'node:assert/strict';
import { selectWeightedCandidate } from '../Scripts/Model/Playback/SelectWeightedCandidate.ts';

test('selection respects weights including boundaries', () => {
    const sounds = [{name: 'a', weight: 1}, {name: 'b', weight: 3}];
    const choose = n => selectWeightedCandidate(sounds, s => s.weight, () => n);
    assert.equal(choose(0), sounds[0]);
    assert.equal(choose(.2499), sounds[0]);
    assert.equal(choose(.25), sounds[1]);
    assert.equal(choose(.9999), sounds[1]);
    assert.throws(() => selectWeightedCandidate([], s => s.weight));
    assert.throws(() => selectWeightedCandidate([{weight: -1}], s => s.weight));
});
