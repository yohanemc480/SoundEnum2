// 開閉・外側クリック・Esc・フォーカス復帰はブラウザのPopover APIに任せる。
function bindSettingsPopover(button, panel)
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
}

bindSettingsPopover(document.querySelector('.app-settings-button'), document.getElementById('app-settings'));
bindSettingsPopover(document.getElementById('command-settings-button'), document.getElementById('command-settings'));
