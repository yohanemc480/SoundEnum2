/** 各検索画面から独立したタブの操作とキーボード移動。 */
export function initializeBrowserTabs()
{
    const tabs = [...document.querySelectorAll('[data-browser-tab]')];
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            tabs.forEach(other => {
                const selected = other === tab;
                other.setAttribute('aria-selected', selected);
                other.tabIndex = selected ? 0 : -1;
                document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
            });
        });
        tab.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
            tabs[next].focus(); tabs[next].click();
        });
    });
}
