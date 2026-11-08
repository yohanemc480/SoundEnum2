import { SoundResourcePaths } from './Constants/SoundResourcePaths.js';

export class SoundSearchResource
{
    serial = 0;
    pending = new Map();

    async load()
    {
        this.dispose();
        const read = async url => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(response.status === 404 ? 'missing' : `HTTP ${response.status}`);
            return response;
        };
        const manifestUrl = new URL(SoundResourcePaths.Search, location.href);
        const manifest = await (await read(manifestUrl)).json();
        if (manifest.schemaVersion !== 1 || manifest.version !== SoundResourcePaths.Version || !/^[a-f0-9]{64}$/.test(manifest.generation)) throw new Error('Invalid manifest');
        const prefix = `search/${manifest.version}/${manifest.generation}/`;
        if (manifest.index !== prefix + 'index.json' || manifest.vectors !== prefix + 'vectors.bin') throw new Error('Invalid paths');
        const [index, binary] = await Promise.all([
            read(new URL(manifest.index, manifestUrl)).then(r => r.json()),
            read(new URL(manifest.vectors, manifestUrl)).then(r => r.arrayBuffer())
        ]);
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', binary))].map(b => b.toString(16).padStart(2, '0')).join('');
        if (hash !== index.vectorHash) throw new Error('Vector checksum mismatch');
        this.worker = new Worker(new URL('./SoundSearchWorker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = ({ data }) => {
            const task = this.pending.get(data.id);
            if (!task) return;
            this.pending.delete(data.id);
            if (data.error) task.reject(new Error(data.error)); else task.resolve(data);
        };
        this.worker.onerror = () => this.dispose();
        await this.request({ type: 'init', index, binary, version: manifest.version, generation: manifest.generation }, [binary]);
        return index;
    }

    request(message, transfer = [])
    {
        return new Promise((resolve, reject) => {
            if (!this.worker) { reject(new Error('Worker unavailable')); return; }
            const id = ++this.serial;
            this.pending.set(id, { resolve, reject });
            this.worker.postMessage({ ...message, id }, transfer);
        });
    }

    dispose()
    {
        this.worker?.terminate();
        this.worker = null;
        for (const task of this.pending.values()) task.reject(new Error('Search worker stopped'));
        this.pending.clear();
    }
}
