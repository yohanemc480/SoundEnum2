/** 利用可能バージョンが空でなく、重複や不正な識別子を含まないことを確認する。 */
export function validateVersions(versions: unknown): asserts versions is string[] {
    if (!Array.isArray(versions) || !versions.length || new Set(versions).size !== versions.length ||
        versions.some((version: unknown) => typeof version !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(version)))
        throw new Error('Invalid available versions');
}

/** 指定されたバージョンが存在しない場合は一覧の先頭を選ぶ。 */
export function selectResourceVersion(versions: unknown, requested: string | null): string {
    validateVersions(versions);
    return requested !== null && versions.includes(requested) ? requested : versions[0];
}

