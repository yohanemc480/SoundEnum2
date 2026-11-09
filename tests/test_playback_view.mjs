import test from 'node:test';
import assert from 'node:assert/strict';
import { HtmlPlaybackView } from '../Scripts/View/Playback/HtmlPlaybackView.ts';

test('ドラッグ位置を維持して一度だけ確定し、音源変更時にドラッグを取り消す', () => {
    const previous = { document: globalThis.document, window: globalThis.window, ResizeObserver: globalThis.ResizeObserver };
    class Element extends EventTarget {
        value = '0'; disabled = false; clientWidth = 0; clientHeight = 0;
        classList = { toggle() {} };
        setAttribute() {}
    }
    const elements = Object.fromEntries(['toggle', 'seek', 'waveform', 'time', 'sound-id', 'status', 'loading'].map(id => [`#preview-${id}`, new Element()]));
    globalThis.document = { querySelector: id => elements[id] };
    globalThis.window = new EventTarget();
    let disconnected = false;
    globalThis.ResizeObserver = class { observe() {} disconnect() { disconnected = true; } };
    const view = new HtmlPlaybackView();
    try {
        const sought = [];
        view.bind({ toggle() {}, seek: value => sought.push(value) });
        const state = { revision: 1, soundName: 'one', hash: 'a', currentTime: 2, duration: 10, ready: true, playing: true, loading: false, error: null, masterVolume: .1 };
        view.showState(state);
        const seek = elements['#preview-seek'];
        seek.dispatchEvent(new Event('pointerdown')); seek.value = '7'; seek.dispatchEvent(new Event('input'));
        view.showState({ ...state, currentTime: 3 }); assert.equal(seek.value, '7');
        seek.dispatchEvent(new Event('change')); window.dispatchEvent(new Event('pointerup'));
        assert.deepEqual(sought, [7]);
        seek.dispatchEvent(new Event('pointerdown')); seek.value = '9';
        view.showState({ ...state, revision: 2, currentTime: 0 });
        assert.equal(seek.value, '0'); window.dispatchEvent(new Event('pointerup'));
        assert.deepEqual(sought, [7]);
        view.dispose(); seek.dispatchEvent(new Event('input')); window.dispatchEvent(new Event('pointerup'));
        assert.deepEqual(sought, [7]); assert.equal(disconnected, true);
    } finally { view.dispose(); Object.assign(globalThis, previous); }
});
