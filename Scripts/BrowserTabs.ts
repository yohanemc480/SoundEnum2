import { readPreferences, savePreferences } from './SearchPreferences.ts';
/** 各検索画面から独立したタブの操作とキーボード移動。 */
export function initializeBrowserTabs(): void
{
    const tabs = [...document.querySelectorAll<HTMLElement>('[data-browser-tab]')];
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            const id = tab.id;
            if (id !== 'search-tab' && id !== 'favorites-tab' && id !== 'compositions-tab') throw new Error(`Unknown browser tab: ${id}`);
            savePreferences({ tab: id });
            tabs.forEach(other => {
                const selected = other === tab;
                other.setAttribute('aria-selected', String(selected));
                other.tabIndex = selected ? 0 : -1;
                const panelId = other.getAttribute('aria-controls');
                const panel = panelId ? document.getElementById(panelId) : null;
                if (!panel) throw new Error(`Missing browser tab panel: ${panelId}`);
                panel.hidden = !selected;
            });
        });
        tab.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
            tabs[next].focus(); tabs[next].click();
        });
    });
    tabs.find(tab => tab.id === readPreferences().tab)?.click();
}
