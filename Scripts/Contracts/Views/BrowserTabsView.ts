import type { BrowserTab } from '../../Model/Navigation/BrowserTab.ts';

/** タブの選択を値で通知し、選択状態とパネル表示を反映する。 */
export interface BrowserTabsView {
    bind(select: (tab: BrowserTab) => void): () => void;
    showSelected(tab: BrowserTab): void;
}
