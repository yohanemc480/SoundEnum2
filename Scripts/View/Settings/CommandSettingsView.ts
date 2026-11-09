import * as layout from '../Layout/Layout.css.ts';
import * as fieldStyles from '../Components/InputFields.css.ts';
import * as settingsStyles from './Settings.css.ts';
import type { CommandSettingsValue } from '../../Model/Command/CommandSettings.ts';
import type { CommandSettingsView, CommandSettingsActions } from '../../Contracts/Views/CommandSettingsView.ts';
import { MCCommandSoundSource } from '../../Model/Command/MCCommandSoundSource.ts';
import { Text } from '../../I18n/Text.ts';

type NumericSetting = 'volume' | 'pitch' | 'minVolume';

/** 設定入力欄を構築する。入力値を通知し、正規化や保存は行わない。 */
export function createCommandSettingsView(panel: HTMLElement | null, onInput: () => void = () => {}): CommandSettingsView {
    let current: CommandSettingsValue;
    let actions: CommandSettingsActions;
    /** 表示済みの値を入力の組み立てに使う。 */
    const read = () => current;
    if (!panel) throw new Error('Missing sound settings panel');
    const heading = document.createElement('div'); heading.className = layout.sectionHeading;
    const title = document.createElement('h2'); title.textContent = Text.commandSettings;
    const close = document.createElement('button'); close.type = 'button';
    close.className = `${settingsStyles.settingsButton} ${settingsStyles.closeButton}`; close.setAttribute('aria-label', Text.closeCommandSettings);
    close.popoverTargetElement = panel; close.popoverTargetAction = 'hide';
    heading.append(title, close);
    const controls = document.createElement('div'); controls.className = fieldStyles.fields;
    const fields = new Map<NumericSetting, { input: HTMLInputElement; slider: HTMLInputElement }>();
    const sourceLabel = document.createElement('label'); sourceLabel.className = fieldStyles.field;
    const caption = document.createElement('span'); caption.className = fieldStyles.label; caption.textContent = Text.source;
    const source = document.createElement('select'); source.className = settingsStyles.soundSettingsSource;
    for (const value of Object.values(MCCommandSoundSource)) source.append(new Option(value, value));
    sourceLabel.append(caption, source); controls.append(sourceLabel);
    /** 正規化済みの現在値を入力欄へ表示する。 */
    function refresh() {
        const value = read();
        source.value = value.source;
        for (const [key, { input, slider }] of fields) {
            input.value = String(value[key]); slider.value = String(value[key]);
        }
        onInput();
    }
    /** 入力値をPresenterへ渡し、反映を待つ。 */
    function commit(value: unknown) { actions.change(value); }
    source.addEventListener('change', () => commit({ ...read(), source: source.value }));
    const definitions: [NumericSetting, string, number, number?][] = [['volume', Text.volume, 0], ['pitch', Text.pitch, .5, 2], ['minVolume', Text.minVolume, 0, 1]];
    for (const [key, text, min, max] of definitions) {
        const label = document.createElement('div'); label.className = fieldStyles.field;
        const caption = document.createElement('span'); caption.className = fieldStyles.label; caption.textContent = text;
        const input = document.createElement('input'); input.type = 'number'; input.min = String(min); input.step = 'any';
        if (max !== undefined) input.max = String(max);
        input.setAttribute('aria-label', text);
        const slider = document.createElement('input'); slider.type = 'range';
        slider.min = String(min); slider.max = String(max ?? 1); slider.step = '0.1'; slider.setAttribute('aria-label', text);
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
    reset.className = `${settingsStyles.settingsButton} ${settingsStyles.resetSoundSettings}`; reset.textContent = Text.resetCommandSettings;
    reset.addEventListener('click', () => actions.reset());
    panel.replaceChildren(heading, controls, reset);
    return { bind: value => { actions = value; }, show: value => { current = value; refresh(); } };
}
