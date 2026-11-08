/** 生成済みデータを実際のWebローダーとWorkerで読み、全候補を検証する。 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Worker as NodeWorker } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { SoundSearchResource } from '../Scripts/SoundSearchResource.js';
import { ResourcePathProvider } from '../Scripts/ResourcePathProvider.js';
import { Text } from '../Scripts/Text.js';
import { resolveSoundEvents } from '../Scripts/ResolveSoundEvents.js';

// HTTPの代わりに同じURLをローカルファイルへ対応付ける。推論やデータは偽装しない。
const root = new URL('../', import.meta.url);
globalThis.location = { href: 'http://localhost/' };
globalThis.fetch = async url => {
    const path = new URL(url).pathname.slice(1);
    try { return new Response(await readFile(new URL(path, root))); }
    catch (error) { if (error.code === 'ENOENT') return new Response('', { status: 404 }); throw error; }
};
globalThis.Worker = class {
    constructor(url) {
        this.worker = new NodeWorker(`
            const { parentPort } = require('node:worker_threads');
            globalThis.self = { postMessage: data => parentPort.postMessage(data) };
            import(${JSON.stringify(url.href)}).then(() => {
                parentPort.on('message', data => self.onmessage({ data }));
            });
        `, { eval: true });
        this.worker.on('message', data => this.onmessage?.({ data }));
        this.worker.on('error', error => this.onerror?.(error));
    }
    postMessage(data, transfer) { this.worker.postMessage(data, transfer); }
    terminate() { return this.worker.terminate(); }
};

const paths = new ResourcePathProvider(JSON.parse(await readFile(new URL('resource/available-versions.json', root)))[0]);
const resource = new SoundSearchResource(paths);
try {
    const start = performance.now();
    const index = await resource.load();
    const loadMs = performance.now() - start;
    const hashes = JSON.parse(await readFile(new URL(`resource/${paths.Version}/audio-file-hashes.json`, root)));
    const sounds = JSON.parse(await readFile(new URL(`resource/${paths.Version}/sound-events.json`, root)));
    const resolved = resolveSoundEvents(sounds);
    for (const event of index.events) {
        assert.ok(event.name in sounds, event.name);
        assert.deepEqual(event.candidates.map(c => [c.name, c.pitch, c.volume]),
            resolved[event.name].map(c => [c.name, c.pitch ?? 1, c.volume ?? 1]), event.name);
        for (const c of event.candidates) assert.equal(hashes[`minecraft/sounds/${c.name}.ogg`], c.hash);
    }
    const all = await resource.request({ type: 'search', options: {} });
    assert.equal(all.results.length, index.events.length);
    const tagCounts = {};
    for (const tag of index.tags) {
        assert.equal(typeof Text[tag.textKey], 'string');
        const result = await resource.request({ type: 'search', options: { tags: [tag.id] } });
        assert.equal(result.results.length, index.events.filter(e => e.candidates.some(c => index.audioTags[c.hash].includes(tag.id))).length);
        assert.ok(result.results.every(row => row.tags.includes(tag.id)));
        tagCounts[tag.id] = result.results.length;
    }
    const representatives = ['block.anvil.land', 'block.glass.break', 'entity.generic.explode', 'block.water.ambient', 'block.wood.break', 'entity.player.hurt'];
    const reports = [];
    for (const base of representatives.filter(name => name in sounds)) {
        const started = performance.now();
        const result = await resource.request({ type: 'search', options: { base } });
        assert.equal(result.results[0].name, base);
        assert.ok(result.results.every(row => Number.isFinite(row.score)));
        for (let i = 1; i < result.results.length; i++) assert.ok(result.results[i - 1].score >= result.results[i].score);
        reports.push({ base, milliseconds: Math.round(performance.now() - started),
            top: result.results.slice(0, 5).map(row => ({ name: row.name, score: +row.score.toFixed(3) })) });
    }
    const binary = await readFile(new URL(paths.SearchVectors, root));
    assert.equal(createHash('sha256').update(binary).digest('hex'), index.vectorHash);
    console.log(JSON.stringify({ events: index.events.length, audio: Object.keys(index.audioTags).length,
        vectorBytes: binary.length, loadMs: Math.round(loadMs), tagCounts, reports }, null, 2));
} finally { resource.dispose(); }
