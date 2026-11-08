import { decodeSearchVectors } from './SearchVectors.js';
import { searchSounds, validateSearchData } from './SoundSearchEngine.js?revision=exclude-multiple-v1';
let index, vectors;
self.onmessage = ({ data }) => {
    try {
        if (data.type === 'init') {
            const decoded = decodeSearchVectors(data.binary);
            vectors = decoded.vectors;
            const rows = new Map(decoded.hashes.map((hash, row) => [hash, row]));
            index = { ...data.index, hashes: decoded.hashes, dimensions: decoded.dimensions,
                events: data.index.events.map(event => ({ ...event,
                    candidates: event.candidates.map(c => ({ ...c, row: rows.get(c.hash) })) })) };
            validateSearchData(index, vectors, data.version);
            self.postMessage({ id: data.id, ready: true });
        } else {
            const results = searchSounds(index, vectors, data.options);
            self.postMessage({ id: data.id, results });
        }
    } catch (error) { self.postMessage({ id: data.id, error: error.message }); }
};
