/** 設定パネルをボタンに追従させる。開閉はPopover APIに任せ、位置監視の解除関数を返す。 */
export function bindSettingsPopover(button: HTMLElement | null, panel: HTMLElement | null): () => void
{
    if (!button || !panel) throw new Error('Missing settings popover element');
    /** 開いているパネルを画面内に収めて、ボタンの下へ配置する。 */
    const positionSettings = (): void => {
        if (!panel.matches(':popover-open')) return;
        const anchor = button.getBoundingClientRect();
        const margin = 12;
        const left = Math.max(margin, Math.min(anchor.right - panel.offsetWidth, window.innerWidth - panel.offsetWidth - margin));
        const top = Math.max(margin, Math.min(anchor.bottom + 8, window.innerHeight - panel.offsetHeight - margin));
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
    };

    panel.addEventListener('toggle', positionSettings);
    window.addEventListener('resize', positionSettings);
    window.addEventListener('scroll', positionSettings, true);
    return () => {
        panel.removeEventListener('toggle', positionSettings);
        window.removeEventListener('resize', positionSettings);
        window.removeEventListener('scroll', positionSettings, true);
    };
}

