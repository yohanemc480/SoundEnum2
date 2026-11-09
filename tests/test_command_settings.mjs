import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandSettings, normalizeCommandSettings } from '../Scripts/Model/Command/CommandSettings.ts';
import { CommandSettingsPresenter } from '../Scripts/Presenter/CommandSettingsPresenter.ts';
import { LocalCommandSettingsStore } from '../Scripts/Infrastructure/Storage/LocalCommandSettingsStore.ts';

test('設定値の精度を保って保存し、別インスタンスで復元する', () => {
    let saved = JSON.stringify({ source: 'block', volume: 3.25, pitch: 1.23, minVolume: .37 });
    globalThis.localStorage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
    try {
        const model = new CommandSettings(); let actions, displayed;
        new CommandSettingsPresenter(model, { bind: value => { actions = value; }, show: value => { displayed = value; } },
            new LocalCommandSettingsStore(), () => assert.fail('storage should work'));
        assert.deepEqual(model.read(), JSON.parse(saved));
        const next = { source: 'ambient', volume: 5.67, pitch: .89, minVolume: .12 };
        actions.change(next);
        assert.deepEqual(JSON.parse(saved), next); assert.deepEqual(displayed, next);
        assert.deepEqual(new CommandSettings(new LocalCommandSettingsStore().read()).read(), next);
        const copy = model.read(); copy.volume = 99; assert.equal(model.read().volume, 5.67);
    } finally { delete globalThis.localStorage; }
});

test('不正な設定値を拒否し、範囲付きの値を上下限に収める', () => {
    assert.deepEqual(normalizeCommandSettings({ source: 'invalid', volume: Infinity, pitch: 9, minVolume: -1 }),
        { source: 'master', volume: 1, pitch: 2, minVolume: 0 });
});

test('保存に失敗してもModelと表示値を維持する', () => {
    const model = new CommandSettings(); let actions, displayed, failures = 0;
    const initial = { source: 'block', volume: 3, pitch: 1.5, minVolume: .2 };
    new CommandSettingsPresenter(model, { bind: value => { actions = value; }, show: value => { displayed = value; } },
        { read: () => initial, save() { throw new Error('quota'); } }, () => failures++);
    actions.reset();
    assert.equal(failures, 1); assert.deepEqual(model.read(), initial); assert.deepEqual(displayed, initial);
});
