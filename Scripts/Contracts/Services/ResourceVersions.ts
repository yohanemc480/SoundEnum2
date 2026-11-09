/** 利用可能なバージョン一覧を取得する。 */
export interface ResourceVersions { load(): Promise<unknown>; dispose(): void }
/** URLからの指定と、選択後の画面遷移を扱う。 */
export interface ResourceVersionNavigation { requestedVersion(): string | null; navigate(version: string): void }
