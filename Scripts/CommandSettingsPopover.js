// 開閉・外側クリック・Esc・フォーカス復帰はブラウザのPopover APIに任せる。
const button = document.getElementById('command-settings-button');
const panel = document.getElementById('command-settings');

function positionSettings()
{
    if (!panel.matches(':popover-open')) return;
    const anchor = button.getBoundingClientRect();
    const margin = 12;
    const left = Math.max(margin, Math.min(anchor.right - panel.offsetWidth, window.innerWidth - panel.offsetWidth - margin));
    const top = Math.max(margin, Math.min(anchor.bottom + 8, window.innerHeight - panel.offsetHeight - margin));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
}

panel.addEventListener('toggle', positionSettings);
window.addEventListener('resize', positionSettings);
window.addEventListener('scroll', positionSettings, true);
