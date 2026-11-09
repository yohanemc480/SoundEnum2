import test from 'node:test';
import assert from 'node:assert/strict';
import { HtmlCompositionView } from '../Scripts/View/Composition/HtmlCompositionView.ts';

test('composition view retains settings elements, reports validity and releases popover listeners', () => {
    const oldDocument = globalThis.document, oldWindow = globalThis.window, oldOption = globalThis.Option;
    class Element extends EventTarget {
        constructor(tag = 'div') { super(); this.tag = tag; }
        children = []; attributes = {}; value = ''; classList = { toggle() {} };
        append(...children) { this.children.push(...children); }
        replaceChildren(...children) { this.children = children; }
        setAttribute(name, value) { this.attributes[name] = value; }
        querySelectorAll(tag) { return this.children.flatMap(child => [...(child.tag === tag ? [child] : []), ...child.querySelectorAll(tag)]); }
        get valueAsNumber() { return this.value === '' ? NaN : Number(this.value); }
        get validity() { return { valid: Number.isFinite(this.valueAsNumber) }; }
    }
    const subscriptions = new Map();
    globalThis.window = {
        addEventListener: (name, callback) => { if (!subscriptions.has(name)) subscriptions.set(name, new Set()); subscriptions.get(name).add(callback); },
        removeEventListener: (name, callback) => subscriptions.get(name)?.delete(callback),
    };
    globalThis.document = { createElement: tag => new Element(tag) };
    globalThis.Option = class extends Element {};
    try {
        const elements = Object.fromEntries(['list', 'play', 'count', 'status', 'loading'].map(name => [name, new Element()]));
        let selected, changed, valid, previewIndex, removed;
        const view = Object.assign(Object.create(HtmlCompositionView.prototype), {
            lifecycle: new AbortController(), settingsViews: new Map(), disposePopovers: [], buildingRows: false,
            element: name => elements[name], output: { SetText() {} }, selectPreview: button => { selected = button; },
            volumeControl: { dispose() {} }, waveform: { dispose() {} },
        });
        view.bind({ settings: (index, value) => { changed = { index, value }; }, validity: value => { valid = value; },
            preview: index => { previewIndex = index; }, similar() {}, remove: index => { removed = index; } });
        const command = { name: 'a', source: 'block', volume: 1.25, pitch: .75, minVolume: .1 };
        view.showRows([{ command, available: true, missing: false }]);
        assert.equal(valid, true);
        const item = elements.list.children[0], heading = item.children[0], panel = item.children[1];
        const input = panel.children[1].children[1].children[2];
        input.value = ''; input.dispatchEvent(new Event('input')); assert.equal(valid, false);
        input.value = '2.75'; input.dispatchEvent(new Event('change'));
        assert.equal(changed.index, 0); assert.equal(changed.value.volume, 2.75);
        view.showSettings(0, command);
        assert.equal(elements.list.children[0], item); assert.equal(input.value, '1.25'); assert.equal(valid, true);
        heading.children[0].dispatchEvent(new Event('click'));
        assert.equal(previewIndex, 0); assert.equal(selected, heading.children[0]);
        heading.children[1].children[2].dispatchEvent(new Event('click')); assert.equal(removed, 0);
        view.showState({ count: 1, command: '', status: 'ready', loading: false, busy: true, canPlay: false });
        assert.equal(elements.play.disabled, false);
        view.showState({ count: 1, command: '', status: 'ready', loading: false, busy: false, canPlay: false });
        assert.equal(elements.play.disabled, true);
        view.showRows([{ command, available: false, missing: true }]);
        assert.equal(subscriptions.get('resize').size, 1);
        assert.equal(elements.list.children[0].children[0].children[0].disabled, true);
        view.dispose(); assert.equal(subscriptions.get('resize').size, 0); assert.equal(subscriptions.get('scroll').size, 0);
    } finally {
        if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
        if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
        if (oldOption === undefined) delete globalThis.Option; else globalThis.Option = oldOption;
    }
});
