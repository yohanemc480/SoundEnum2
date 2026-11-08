// 開閉・外側クリック・Esc・フォーカス復帰はブラウザのPopover APIに任せる。
export function bindSettingsPopover(button, panel)
{
    function positionSettings()
    {
        if (!panel.matches(':popover-open')) return;
        const anchor = button.getBoundingClientRect();
        const margin = 12;
        const left = Math.max(margin, Math.min(anchor.right - panel.offsetWidth, window.innerWidth - panel.offsetWidth - margin));
        const top = Math.max(margin, Math.min(anchor.bottom + 8, window.innerHeight - panel.offsetHeight - margin));
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
    }

    panel.addEventListener('toggle', positionSettings);
    window.addEventListener('resize', positionSettings);
    window.addEventListener('scroll', positionSettings, true);
    return () => {
        panel.removeEventListener('toggle', positionSettings);
        window.removeEventListener('resize', positionSettings);
        window.removeEventListener('scroll', positionSettings, true);
    };
}

