import { decodeSearchVectors } from './SearchVectors.ts';
import { searchSounds, validateSearchData } from './SoundSearchEngine.ts';
import type { SearchIndex, SearchWorkerRequest, SearchWorkerResponse } from './SearchTypes.ts';

let index: SearchIndex | undefined;
let vectors: Float32Array | undefined;
const send = (message: SearchWorkerResponse): void => self.postMessage(message);
self.onmessage = ({ data }: MessageEvent<SearchWorkerRequest>) => {
    try {
        if (data.type === 'init') {
            // 初期化に失敗した場合は、以前のデータで検索を続けない。
            index = undefined;
            vectors = undefined;
            const decoded = decodeSearchVectors(data.binary);
            const rows = new Map(decoded.hashes.map((hash, row) => [hash, row]));
            const nextIndex: SearchIndex = { ...data.index, hashes: decoded.hashes, dimensions: decoded.dimensions,
                events: data.index.events.map(event => ({ ...event,
                    candidates: event.candidates.map(candidate => {
                        const row = rows.get(candidate.hash);
                        if (row === undefined) throw new Error('Invalid candidate');
                        return { ...candidate, row };
                    }) })) };
            validateSearchData(nextIndex, decoded.vectors, data.version);
            index = nextIndex;
            vectors = decoded.vectors;
            send({ id: data.id, ready: true });
        } else {
            if (!index || !vectors) throw new Error('Search worker is not initialized');
            send({ id: data.id, results: searchSounds(index, vectors, data.options) });
        }
    } catch (error) {
        send({ id: data.id, error: error instanceof Error ? error.message : String(error) });
    }
};
