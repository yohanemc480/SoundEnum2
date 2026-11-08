import { searchSounds, validateSearchData } from './SoundSearchEngine.js';
let index, vectors;
self.onmessage = ({ data }) => {
    try {
        if (data.type === 'init') {
            const view = new DataView(data.binary);
            vectors = new Float32Array(data.binary.byteLength / 4);
            for (let i = 0; i < vectors.length; i++) vectors[i] = view.getFloat32(i * 4, true);
            index = data.index;
            validateSearchData(index, vectors, data.version);
            self.postMessage({ id: data.id, ready: true });
        } else {
            const results = searchSounds(index, vectors, data.options);
            self.postMessage({ id: data.id, results });
        }
    } catch (error) { self.postMessage({ id: data.id, error: error.message }); }
};
