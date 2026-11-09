/** お気に入りの保存操作。読み込みに失敗した場合はPresenterへnullを渡す。 */
export interface FavoriteSoundsStore {
    readonly names: ReadonlySet<string>;
    toggle(name: string): void;
}

/** DOMやタイマーAPIをPresenterに持ち込まず、操作の待機と確認を依頼する。 */
export interface SearchInteractionServices {
    schedule(callback: () => void, milliseconds: number): () => void;
    confirmFavoriteRemoval(name: string): Promise<boolean>;
    notifyFailure(operation: 'favorites' | 'preview'): void;
}
