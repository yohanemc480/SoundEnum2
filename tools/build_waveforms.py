"""保存済み音声から表示用波形を生成する（通信・CLAP推論不要）。"""
import argparse
import json
import re
from pathlib import Path
from sound_search_data import write_json

ROOT = Path(__file__).resolve().parents[1]
BINS = 256


def build_waveforms(root, version, hash_bytes=None):
    import numpy as np
    import soundfile as sf
    hashes = sorted(set(json.loads(hash_bytes or (root / 'resource' / version / 'audio-file-hashes.json').read_bytes()).values()))
    target = root / 'resource' / 'audio-waveform-peaks.json'
    if target.exists():
        data = json.loads(target.read_bytes())
        if data.get('schemaVersion') != 1 or data.get('bins') != BINS or not isinstance(data.get('waveforms'), dict):
            raise ValueError('Incompatible waveform format; regenerate explicitly')
        waveforms = data['waveforms']
    else:
        waveforms = {}
    added = 0
    for number, sha1 in enumerate(hashes, 1):
        if not re.fullmatch(r'[a-f0-9]{40}', sha1):
            raise ValueError('Invalid audio hash')
        values = waveforms.get(sha1)
        if (isinstance(values, list) and 0 < len(values) <= BINS
                and all(type(v) is int and 0 <= v <= 255 for v in values)):
            continue
        added += 1
        audio, _ = sf.read(root / 'resource/audio' / f'{sha1}.ogg', dtype='float32', always_2d=True)
        if not len(audio) or not np.isfinite(audio).all():
            raise ValueError(f'Invalid audio: {sha1}')
        samples = np.max(np.abs(audio), axis=1)
        count = min(BINS, len(samples))
        edges = np.arange(count + 1, dtype=np.int64) * len(samples) // count
        peaks = np.array([samples[edges[i]:edges[i + 1]].max() for i in range(count)])
        waveforms[sha1] = np.rint(np.clip(peaks, 0, 1) * 255).astype('uint8').tolist()
        if number % 500 == 0:
            print(f'Waveforms: {number}/{len(hashes)}', flush=True)
    if added or not target.exists():
        write_json(target, {'schemaVersion': 1, 'bins': BINS, 'waveforms': waveforms})
    print(f'Generated {added}; total {len(waveforms)} waveforms, {target.stat().st_size} bytes', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('version')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', args.version):
        parser.error('Invalid version')
    build_waveforms(ROOT, args.version)
