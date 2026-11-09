/** 保存対象のサウンド名を検証し、重複を除いたコピーを返す。 */
export function normalizeFavoriteSounds(value: unknown): string[] {
    if (!Array.isArray(value) || value.some(name => typeof name !== 'string')) throw new Error('Invalid favorites');
    return [...new Set(value.filter((name): name is string => typeof name === 'string'))];
}

/** お気に入りの名前と追加・削除のルールを所有する。保存先には依存しない。 */
export class FavoriteSounds {
    private names = new Set<string>();
    /** 呼び出し元から内部状態を書き換えられないコピーを返す。 */
    read(): string[] { return [...this.names]; }
    has(name: string): boolean { return this.names.has(name); }
    /** 復元時、または保存成功後に状態を確定する。 */
    replace(names: unknown): void { this.names = new Set(normalizeFavoriteSounds(names)); }
    /** 登録状態を反転した候補を作る。内部状態は保存成功まで変更しない。 */
    withToggled(name: string): string[] {
        const next = new Set(this.names);
        if (next.has(name)) next.delete(name); else next.add(name);
        return normalizeFavoriteSounds([...next]);
    }
}
