import { MCCommandSoundSource } from './Constants/MCCommandSoundSource.js';
import { LocalStorageSchema, normalizeCommandSettings } from './LocalStorageSchema.js';
import { Text } from './Text.js';

/** 単音・組み合わせ共通の設定UI。保存先は呼び出し側から渡す。 */
export function mountSoundSettings(panel, { read, save, onInput = () => {} }) {
    const heading = document.createElement('div'); heading.className = 'section-heading';
    const title = document.createElement('h2'); title.textContent = Text.commandSettings;
    const close = document.createElement('button'); close.type = 'button';
    close.className = 'settings-button close-button'; close.setAttribute('aria-label', Text.closeCommandSettings);
    close.popoverTargetElement = panel; close.popoverTargetAction = 'hide';
    heading.append(title, close);
    const controls = document.createElement('div'); controls.className = 'params';
    const fields = new Map();
    const sourceLabel = document.createElement('label'); sourceLabel.className = 'param';
    const caption = document.createElement('span'); caption.className = 'param-label'; caption.textContent = Text.source;
    const source = document.createElement('select'); source.className = 'sound-settings-source';
    for (const value of Object.values(MCCommandSoundSource)) source.append(new Option(value, value));
    sourceLabel.append(caption, source); controls.append(sourceLabel);
    function refresh() {
        const value = read();
        source.value = value.source;
        for (const [key, { input, slider }] of fields) {
            input.value = value[key]; slider.value = value[key];
        }
        onInput();
    }
    function commit(value) { save(normalizeCommandSettings(value)); refresh(); }
    source.addEventListener('change', () => commit({ ...read(), source: source.value }));
    for (const [key, text, min, max] of [['volume', Text.volume, 0], ['pitch', Text.pitch, .5, 2], ['minVolume', Text.minVolume, 0, 1]]) {
        const label = document.createElement('div'); label.className = 'param';
        const caption = document.createElement('span'); caption.className = 'param-label'; caption.textContent = text;
        const input = document.createElement('input'); input.type = 'number'; input.min = min; input.step = 'any';
        if (max !== undefined) input.max = max;
        input.setAttribute('aria-label', text);
        const slider = document.createElement('input'); slider.type = 'range';
        slider.min = min; slider.max = max ?? 1; slider.step = '0.1'; slider.setAttribute('aria-label', text);
        slider.addEventListener('input', () => commit({ ...read(), [key]: slider.valueAsNumber }));
        input.addEventListener('input', onInput);
        input.addEventListener('change', () => {
            if (!Number.isFinite(input.valueAsNumber)) { refresh(); return; }
            commit({ ...read(), [key]: input.valueAsNumber });
        });
        fields.set(key, { input, slider });
        label.append(caption, slider, input); controls.append(label);
    }
    const reset = document.createElement('button'); reset.type = 'button';
    reset.className = 'settings-button reset-sound-settings'; reset.textContent = Text.resetCommandSettings;
    reset.addEventListener('click', () => commit(LocalStorageSchema.CommandSettings.createDefault()));
    panel.replaceChildren(heading, controls, reset);
    refresh();
}
