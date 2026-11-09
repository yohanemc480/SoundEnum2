import { fetchJsonResource } from './ResourceCache.ts';
import type { ResourceVersions } from '../../Contracts/Services/ResourceVersions.ts';

/** 配布済みのバージョン一覧を取得し、終了時に通信を取り消す。 */
export class FetchResourceVersions implements ResourceVersions {
    private readonly controller = new AbortController();
    async load(): Promise<unknown> {
        return fetchJsonResource('resource/available-versions.json', this.controller.signal);
    }
    dispose(): void { this.controller.abort(); }
}
