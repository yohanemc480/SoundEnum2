import test from 'node:test';
import assert from 'node:assert/strict';
import { selectWeightedCandidate } from '../Scripts/SelectWeightedCandidate.js';
import { MCRawSound } from '../Scripts/MCRawSound.js';

test('selection respects weights and default weight including boundaries', () => {
    const sounds = [new MCRawSound({name: 'a'}), new MCRawSound({name: 'b', weight: 3})];
    const choose = n => selectWeightedCandidate(sounds, s => s.GetWeight(), () => n);
    assert.equal(choose(0), sounds[0]);
    assert.equal(choose(.2499), sounds[0]);
    assert.equal(choose(.25), sounds[1]);
    assert.equal(choose(.9999), sounds[1]);
    assert.throws(() => selectWeightedCandidate([], s => s.weight));
    assert.throws(() => selectWeightedCandidate([{weight: -1}], s => s.weight));
});
