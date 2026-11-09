import type { ResourceVersions } from '../../Contracts/Services/ResourceVersions.ts';

/** 配布済みのバージョン一覧を取得し、終了時に通信を取り消す。 */
export class FetchResourceVersions implements ResourceVersions {
    private readonly controller = new AbortController();
    async load(): Promise<unknown> {
        const response = await fetch('resource/available-versions.json', { cache: 'no-cache', signal: this.controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }
    dispose(): void { this.controller.abort(); }
}
