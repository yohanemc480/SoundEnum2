/** お気に入りの名前を読み書きする。失敗は例外で通知する。 */
export interface FavoriteSoundsStore {
    read(): string[];
    save(names: string[]): void;
}
