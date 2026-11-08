import { Text } from "./Text.js";
import { SoundManager } from "./Singletons/SoundManager.js";
import { SettingDefine } from "./Constants/SettingDefine.js";

/**
 * マスター音量調整エリアを表すクラス
 */
export class SelectMasterVolumeArea
{
    _textHolder;
    _slider;
    constructor(appendTarget)
    {
        const control = document.querySelector('.preview-volume-control');
        const button = document.querySelector('#preview-volume-toggle');
        const panel = document.querySelector(appendTarget);
        const setOpen = open => {
            panel.hidden = !open;
            button.setAttribute('aria-expanded', String(open));
        };
        // アイコンからスライダーへ移動しても閉じず、タッチとキーボードでも操作できる。
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
        $(document).ready(() =>
        {
            let $textHolder = $("<div>",
            {
                text: SettingDefine.DefaultMasterVolume
            })

            let $slider = $("<input>",
            {
                type: "range",
                id: "preview-volume",
                "aria-label": Text.previewVolume,
                min: SettingDefine.MinMasterVolume,
                max: SettingDefine.MaxMasterVolume,
                step: "0.01", 
                value: SettingDefine.DefaultMasterVolume
            }).appendTo(appendTarget);

            $slider.on("input", () =>
            {
                var value = $slider.val();
                this.OnUpdateValue(value);
            });

            $slider.appendTo(appendTarget);
            $textHolder.appendTo(appendTarget);

            this._textHolder = $textHolder;
            this._slider = $slider;
        });
    }

    OnUpdateValue(value)
    {
        SoundManager.Instance.SetMasterVolume(value);
        this._textHolder.text(value);
        this._slider.val(value);
    }
}
