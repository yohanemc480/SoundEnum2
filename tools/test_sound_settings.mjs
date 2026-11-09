import test from 'node:test';
import assert from 'node:assert/strict';
import { mountSoundSettings } from '../Scripts/App/MountSoundSettings.ts';
import { LocalStorageSchema } from '../Scripts/LocalStorageSchema.ts';

test('shared settings preserve precision and reset only their own saved values', () => {
    const oldDocument = globalThis.document, oldOption = globalThis.Option;
    class Element {
        children = []; listeners = {};
        append(...children) { this.children.push(...children); }
        replaceChildren(...children) { this.children = children; }
        setAttribute() {}
        addEventListener(type, handler) { this.listeners[type] = handler; }
        get valueAsNumber() { return Number(this.value); }
    }
    globalThis.document = { createElement: () => new Element() };
    globalThis.Option = class {};
    try {
        const defaults = LocalStorageSchema.CommandSettings.createDefault();
        let first = { ...defaults, source: 'block', volume: 2.35, pitch: .75, minVolume: .35 };
        let second = { ...defaults, source: 'music', pitch: 1.5 };
        const panel = new Element(), other = new Element();
        mountSoundSettings(panel, { read: () => first, save: value => { first = value; } });
        mountSoundSettings(other, { read: () => second, save: value => { second = value; } });
        const volumeInput = panel.children[1].children[1].children[2];
        volumeInput.value = '3.25';
        volumeInput.listeners.change();
        assert.equal(first.volume, 3.25);
        panel.children[2].listeners.click();
        assert.deepEqual(first, defaults);
        assert.equal(volumeInput.value, String(defaults.volume));
        assert.equal(second.pitch, 1.5);
        assert.equal(second.source, 'music');
    } finally { globalThis.document = oldDocument; globalThis.Option = oldOption; }
});
