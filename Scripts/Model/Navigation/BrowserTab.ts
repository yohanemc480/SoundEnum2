/** 保存済みデータと画面で共通に使うタブの識別子。 */
export type BrowserTab = 'search-tab' | 'favorites-tab' | 'compositions-tab';

/** 復元・操作の対象が既知のタブか判定する。 */
export function isBrowserTab(value: unknown): value is BrowserTab {
    return value === 'search-tab' || value === 'favorites-tab' || value === 'compositions-tab';
}
