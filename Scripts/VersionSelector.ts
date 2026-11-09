import type { BrowserPreferencesStore } from './Contracts/Services/BrowserPreferencesStore.ts';
import { Text } from './Text.ts';

/** 利用可能バージョンが空でなく、重複や不正な識別子を含まないことを確認する。 */
function validateVersions(versions: unknown): asserts versions is string[] {
    if (!Array.isArray(versions) || !versions.length || new Set(versions).size !== versions.length ||
        versions.some((version: unknown) => typeof version !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(version)))
        throw new Error('Invalid available versions');
}

/** 指定されたバージョンが存在しない場合は一覧の先頭を選ぶ。 */
export function selectResourceVersion(versions: unknown, requested: string | null): string {
    validateVersions(versions);
    return requested !== null && versions.includes(requested) ? requested : versions[0];
}

/** 選択肢を取得し、URL指定を保存設定より優先して復元する。保存先はAppから受け取る。 */
export async function initializeVersionSelector(preferences: BrowserPreferencesStore): Promise<string>
{
    const select = document.querySelector<HTMLSelectElement>('#resource-version');
    if (!select) throw new Error('Missing resource version selector');
    try {
        const response = await fetch('resource/available-versions.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const versions: unknown = await response.json();
        validateVersions(versions);
        const url = new URL(location.href);
        const version = selectResourceVersion(versions, url.searchParams.get('version') ?? preferences.read().version);
        select.replaceChildren(...versions.map(v => new Option(v, v)));
        select.value = version;
        preferences.update({ version });
        select.disabled = false;
        select.addEventListener('change', () => {
            preferences.update({ version: select.value });
            url.searchParams.set('version', select.value);
            location.assign(url.href);
        });
        return version;
    } catch (error) {
        const message = document.createElement('p');
        message.setAttribute('role', 'alert');
        message.textContent = Text.versionLoadFailure;
        select.parentElement?.append(message);
        throw error;
    }
}
