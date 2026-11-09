import * as styles from './VolumeControl.css.ts';
import { Text } from "./Text.ts";
import { SoundManager } from "./Singletons/SoundManager.ts";
import { SettingDefine } from "./Constants/SettingDefine.ts";

/**
 * マスター音量調整エリアを表すクラス
 */
export class SelectMasterVolumeArea
{
    _slider: HTMLInputElement;
    onChange: (value: number) => void;
    constructor(appendTarget: string, { value = SoundManager.Instance.GetMasterVolume(), onChange = value => SoundManager.Instance.SetMasterVolume(value) }: { value?: number; onChange?: (value: number) => void } = {})
    {
        this.onChange = onChange;
        const panel = document.querySelector<HTMLElement>(appendTarget);
        if (!panel) throw new Error(`Missing volume panel: ${appendTarget}`);
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = styles.slider;
        slider.setAttribute('aria-label', Text.previewVolume);
        slider.min = String(SettingDefine.MinMasterVolume);
        slider.max = String(SettingDefine.MaxMasterVolume);
        slider.step = '0.01';
        slider.value = String(value);
        slider.addEventListener('input', () => this.OnUpdateValue(slider.value));
        panel.replaceChildren(slider);
        this._slider = slider;
        const control = panel.closest<HTMLElement>('[data-volume-control]');
        if (!control) throw new Error('Missing volume control');
        control.classList.add(styles.control);
        const button = control.querySelector('button');
        if (!button) throw new Error('Missing volume button');
        const setOpen = (open: boolean) => {
            control.classList.toggle(styles.open, open);
            panel.inert = !open;
            panel.setAttribute('aria-hidden', String(!open));
            button.setAttribute('aria-expanded', String(open));
        };
        control.addEventListener('pointerenter', event => {
            if (event.pointerType !== 'touch') setOpen(true);
        });
        control.addEventListener('pointerleave', () => {
            if (!control.contains(document.activeElement)) setOpen(false);
        });
        control.addEventListener('focusin', () => setOpen(true));
        control.addEventListener('focusout', event => {
            if (!(event.relatedTarget instanceof Node) || !control.contains(event.relatedTarget)) setOpen(false);
        });
        button.addEventListener('click', () => setOpen(true));
        document.addEventListener('pointerdown', event => {
            if (!(event.target instanceof Node) || !control.contains(event.target)) setOpen(false);
        });
        control.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                button.focus();
                setOpen(false);
            }
        });
        setOpen(false);
    }

    OnUpdateValue(value: string | number): void
    {
        this.onChange(Number(value));
        this._slider.value = String(value);
    }
}
