import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundManager } from '../Scripts/Singletons/SoundManager.ts';
import { ResourceManager } from '../Scripts/Singletons/ResourceManager.ts';
import { MCRawSound } from '../Scripts/MCRawSound.ts';

test('playback keeps pitch and volume and ignores superseded downloads', async () => {
    const previous = { Audio: globalThis.Audio, localStorage: globalThis.localStorage,
        fetch: globalThis.fetch, sound: SoundManager.Instance, resource: ResourceManager.Instance };
    const requests = [];
    globalThis.Audio = class extends EventTarget {
        dataset = {};
        plays = 0;
        pause() {}
        load() {}
        removeAttribute() {}
        play() { this.plays++; return Promise.resolve(); }
    };
    globalThis.localStorage = { getItem: () => null };
    globalThis.fetch = (url, options) => new Promise(resolve => requests.push({ url, options, resolve }));
    ResourceManager.Instance = { GetSoundHashResouce: () => ({ NameToHash: () => 'a'.repeat(40) }) };
    let manager;
    try {
        manager = new SoundManager();
        manager.SetMasterVolume(.8);
        const raw = new MCRawSound({ name: 'raw', pitch: .5, volume: .5 });
        const command = { GetRawSoundRandomly: () => raw, GetSoundName: () => 'event',
            GetPitch: () => 2, GetVolume: () => 3 };
        const oldPlay = manager.Play(command);
        const newPlay = manager.Play(command);
        assert.equal(requests[0].options.signal.aborted, true);
        requests[1].resolve(new Response(new Blob(['audio'])));
        await newPlay;
        assert.equal(manager.GetAudio().playbackRate, 1);
        assert.equal(manager.GetAudio().volume, 1);
        assert.equal(manager.GetAudio().plays, 1);
        const currentUrl = manager.GetAudio().src;
        requests[0].resolve(new Response(new Blob(['old'])));
        await oldPlay;
        assert.equal(manager.GetAudio().src, currentUrl);
        assert.equal(manager.GetAudio().plays, 1);
        let errors = 0;
        manager.GetAudio().addEventListener('previewerror', () => errors++);
        const failedPlay = manager.Play(command);
        requests[2].resolve(new Response('', { status: 404 }));
        await failedPlay;
        assert.equal(errors, 1);
        assert.equal(manager.GetAudio().plays, 1);
    } finally {
        if (manager?._audioUrl) URL.revokeObjectURL(manager._audioUrl);
        for (const name of ['Audio', 'localStorage', 'fetch']) {
            if (previous[name] === undefined) delete globalThis[name];
            else globalThis[name] = previous[name];
        }
        SoundManager.Instance = previous.sound;
        ResourceManager.Instance = previous.resource;
    }
});

test('missing audio hashes fail before forming an invalid audio URL', () => {
    const raw = new MCRawSound({ name: 'missing' });
    assert.throws(() => raw.CreateLink({ NameToHash: () => undefined }), /Missing audio hash/);
});
