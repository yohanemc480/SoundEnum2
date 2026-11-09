/** バージョンの選択肢と読込状態を表示し、選択値だけを通知する。 */
export interface ResourceVersionView {
    bind(change: (version: string) => void): () => void;
    showLoading(): void;
    showVersions(versions: readonly string[], selected: string): void;
    showFailure(): void;
}
