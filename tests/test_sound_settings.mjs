import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandSettings } from '../Scripts/Model/Command/CommandSettings.ts';
import { CommandSettingsPresenter } from '../Scripts/Presenter/CommandSettingsPresenter.ts';
import { createCommandSettingsView } from '../Scripts/View/Settings/CommandSettingsView.ts';
import { LocalStorageSchema } from '../Scripts/Infrastructure/Storage/LocalStorageSchema.ts';

test('共通設定の数値精度を維持し、リセットは対象の保存値だけを変更する', () => {
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
        new CommandSettingsPresenter(new CommandSettings(), createCommandSettingsView(panel, undefined, true),
            { read: () => first, save: value => { first = value; } }, () => assert.fail('Unexpected settings failure'));
        new CommandSettingsPresenter(new CommandSettings(), createCommandSettingsView(other),
            { read: () => second, save: value => { second = value; } }, () => assert.fail('Unexpected settings failure'));
        const volumeInput = panel.children[0].children[0].children[2];
        volumeInput.value = '3.25';
        volumeInput.listeners.change();
        assert.equal(first.volume, 3.25);
        panel.children[2].listeners.click();
        assert.deepEqual(first, defaults);
        assert.equal(volumeInput.value, String(defaults.volume));
        assert.equal(panel.children[0].children.length, 2);
        const details = panel.children[1];
        assert.equal(details.open, false);
        assert.equal(details.children[1].children.length, 2);
        const sourceSelect = details.children[1].children[0].children[1];
        sourceSelect.value = 'music';
        sourceSelect.listeners.change();
        assert.equal(first.source, 'music');
        assert.equal(details.open, false);
        details.open = true;
        volumeInput.value = '0.5';
        volumeInput.listeners.change();
        assert.equal(details.open, true);
        assert.equal(second.pitch, 1.5);
        assert.equal(second.source, 'music');
    } finally { globalThis.document = oldDocument; globalThis.Option = oldOption; }
});
