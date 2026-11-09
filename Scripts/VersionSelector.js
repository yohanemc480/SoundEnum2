import { readPreferences, savePreferences } from './SearchPreferences.ts';
import { Text } from './Text.js';

export function selectResourceVersion(versions, requested)
{
    if (!Array.isArray(versions) || !versions.length || new Set(versions).size !== versions.length ||
        versions.some(v => typeof v !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v)))
        throw new Error('Invalid available versions');
    return versions.includes(requested) ? requested : versions[0];
}

export async function initializeVersionSelector()
{
    const select = document.getElementById('resource-version');
    try {
        const response = await fetch('resource/available-versions.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const versions = await response.json();
        const url = new URL(location.href);
        const version = selectResourceVersion(versions, url.searchParams.get('version') ?? readPreferences().version);
        select.replaceChildren(...versions.map(v => new Option(v, v)));
        select.value = version;
        savePreferences({ version });
        select.disabled = false;
        select.addEventListener('change', () => {
            savePreferences({ version: select.value });
            url.searchParams.set('version', select.value);
            location.assign(url.href);
        });
        return version;
    } catch (error) {
        const message = document.createElement('p');
        message.setAttribute('role', 'alert');
        message.textContent = Text.versionLoadFailure;
        select.parentElement.append(message);
        throw error;
    }
}
