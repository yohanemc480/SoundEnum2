import { Text } from "./Text.js";
import { SoundManager } from "./Singletons/SoundManager.js";
import { SettingDefine } from "./Constants/SettingDefine.ts";

/**
 * マスター音量調整エリアを表すクラス
 */
export class SelectMasterVolumeArea
{
    _slider;
    constructor(appendTarget, { value = SoundManager.Instance.GetMasterVolume(), onChange = value => SoundManager.Instance.SetMasterVolume(value) } = {})
    {
        this.onChange = onChange;
        const panel = document.querySelector(appendTarget);
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'preview-volume-slider';
        slider.setAttribute('aria-label', Text.previewVolume);
        slider.min = SettingDefine.MinMasterVolume;
        slider.max = SettingDefine.MaxMasterVolume;
        slider.step = '0.01';
        slider.value = value;
        slider.addEventListener('input', () => this.OnUpdateValue(slider.value));
        panel.replaceChildren(slider);
        this._slider = slider;
        const control = panel.closest('.preview-volume-control');
        const button = control.querySelector('button');
        const setOpen = open => {
            control.classList.toggle('is-open', open);
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
            if (!control.contains(event.relatedTarget)) setOpen(false);
        });
        button.addEventListener('click', () => setOpen(true));
        document.addEventListener('pointerdown', event => {
            if (!control.contains(event.target)) setOpen(false);
        });
        control.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                button.focus();
                setOpen(false);
            }
        });
        setOpen(false);
    }

    OnUpdateValue(value)
    {
        this.onChange(Number(value));
        this._slider.value = value;
    }
}
