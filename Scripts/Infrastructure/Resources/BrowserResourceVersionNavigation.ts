import type { ResourceVersionNavigation } from '../../Contracts/Services/ResourceVersions.ts';

/** 他のクエリとハッシュを保持し、versionだけを変更して遷移する。 */
export class BrowserResourceVersionNavigation implements ResourceVersionNavigation {
    requestedVersion(): string | null { return new URL(location.href).searchParams.get('version'); }
    navigate(version: string): void {
        const url = new URL(location.href); url.searchParams.set('version', version); location.assign(url.href);
    }
}
