import { resourceCache } from './ResourceCache.ts';

/** 共有キャッシュからテキストを取得する。中断はこの呼び出し元だけに適用する。 */
export async function fetchTextResource(path: string, signal: AbortSignal): Promise<string> {
    return new TextDecoder().decode(await resourceCache.load(path, signal));
}
