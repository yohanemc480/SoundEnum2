import test from 'node:test';
import assert from 'node:assert/strict';
import { SearchWaveforms } from '../Scripts/SearchWaveforms.ts';

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
