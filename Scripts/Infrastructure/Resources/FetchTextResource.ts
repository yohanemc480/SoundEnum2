/** 起動用のJSONテキストを取得する。終了時は渡されたsignalで通信を取り消す。 */
export async function fetchTextResource(path: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(path, { signal });
    if (!response.ok) throw new Error(`Failed to load resource: ${path} (HTTP ${response.status})`);
    return response.text();
}
