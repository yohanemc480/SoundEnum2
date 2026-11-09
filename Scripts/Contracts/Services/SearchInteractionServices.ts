/** DOMやタイマーAPIをPresenterに持ち込まず、操作の待機と確認を依頼する。 */
export interface SearchInteractionServices {
    schedule(callback: () => void, milliseconds: number): () => void;
    confirmFavoriteRemoval(name: string): Promise<boolean>;
    notifyFailure(operation: 'favorites' | 'preview'): void;
}
