"""CLAPで音声・タグ検索用の静的データを生成する。"""
import argparse
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path
import re
import sys
import struct
from sound_search_data import assign_tags, digest, resolve_events, validate_tags, write_binary, write_json

ROOT = Path(__file__).resolve().parents[1]
MODEL = 'laion/clap-htsat-unfused'
REVISION = '8fa0f1c6d0433df6e97c127f64b2a1d6c0dcda8a'
PREPROCESS = 'mono-resample-10s-weighted-v2'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('version')
    parser.add_argument('--limit', type=int, help='検証用。通常の検索データを更新しない')
    parser.add_argument('--revision', default=REVISION, help='CLAPモデルのcommit')
    parser.add_argument('--offline', action='store_true', help='取得済みモデルのみ使用する')
    parser.add_argument('--validate-only', action='store_true', help='モデル不要で参照整合性を検証')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9._-]+', args.version):
        parser.error('Invalid version')
    if args.limit is not None and args.limit < 1:
        parser.error('limit must be positive')
    resource = ROOT / 'resource'
    read = lambda p: json.loads(p.read_bytes())
    sounds = read(resource / args.version / 'sounds.json')
    assets = read(resource / args.version / 'hash.json')
    all_durations = read(resource / 'durations.json')
    durations = {sha1: all_durations[sha1] for sha1 in sorted(set(assets.values()))}
    tags = read(ROOT / 'tools/sound-tags.json')
    overrides = read(ROOT / 'tools/sound-tag-overrides.json')
    validate_tags(tags, overrides)
    events = resolve_events(sounds, assets, durations)
    hashes = sorted({c['hash'] for cs in events.values() for c in cs})
    for sha1 in hashes:
        path = resource / 'audio' / f'{sha1}.ogg'
        if not path.is_file() or hashlib.sha1(path.read_bytes()).hexdigest() != sha1:
            raise ValueError(f'Missing/corrupt audio: {sha1}')
    print(f'Validated {len(events)} events, {len(hashes)} audio files, {len(tags)} tags', flush=True)
    if args.validate_only:
        return
    if args.limit:
        hashes = hashes[:args.limit]
        included = set(hashes)
        events = {name: cs for name, cs in events.items() if cs and all(c['hash'] in included for c in cs)}
    import numpy as np
    import soundfile as sf
    import torch
    from scipy.signal import resample_poly
    from transformers import ClapModel, ClapProcessor
    np.random.seed(0)
    torch.manual_seed(0)
    cache = ROOT / '.cache/clap'
    model = ClapModel.from_pretrained(MODEL, revision=args.revision, cache_dir=cache / 'model', local_files_only=args.offline)
    revision = model.config._commit_hash
    if not revision:
        raise ValueError('Cannot determine model revision')
    processor = ClapProcessor.from_pretrained(MODEL, revision=revision, cache_dir=cache / 'model', local_files_only=args.offline)
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model.to(device).eval()
    dependencies = {name: importlib.metadata.version(name) for name in
                    ['numpy', 'scipy', 'soundfile', 'torch', 'transformers']}
    metadata = {'model': MODEL, 'revision': revision, 'preprocess': PREPROCESS,
                'dependencies': dependencies, 'device': device}
    cache_key = digest(metadata)
    rate = processor.feature_extractor.sampling_rate
    window = rate * 10
    dimensions = model.config.projection_dim

    def normalize(vector):
        vector = np.asarray(vector, dtype=np.float32)
        norm = np.linalg.norm(vector)
        if vector.shape != (dimensions,) or not np.isfinite(vector).all() or norm < 1e-12:
            raise ValueError('Invalid embedding')
        return vector / norm

    vectors = []
    print(f'CLAP: {device}, revision={revision}', flush=True)
    for i, sha1 in enumerate(hashes):
        cached = cache / cache_key / f'{sha1}.json'
        try:
            # 保存済みの単位ベクトルを再正規化すると丸め誤差で世代IDが変わる。
            vector = np.asarray(read(cached), dtype=np.float32)
            if (vector.shape != (dimensions,) or not np.isfinite(vector).all()
                    or abs(float(np.linalg.norm(vector)) - 1) > 1e-5):
                raise ValueError('Invalid cached embedding')
        except (OSError, ValueError, TypeError):
            audio, source_rate = sf.read(resource / 'audio' / f'{sha1}.ogg', dtype='float32', always_2d=True)
            audio = audio.mean(axis=1)
            if not len(audio) or not np.isfinite(audio).all():
                raise ValueError(f'Invalid audio: {sha1}')
            divisor = math.gcd(source_rate, rate)
            audio = resample_poly(audio, rate // divisor, source_rate // divisor)
            chunks, weights = [], []
            for start in range(0, len(audio), window):
                chunk = audio[start:start + window]
                inputs = processor.feature_extractor(chunk, sampling_rate=rate, return_tensors='pt')
                with torch.inference_mode():
                    feature = model.get_audio_features(**inputs.to(device))[0]
                chunks.append(normalize(feature.cpu().numpy()))
                weights.append(len(chunk))
            vector = normalize(np.average(chunks, axis=0, weights=weights))
            write_json(cached, vector.tolist())
        vectors.append(vector)
        print(f'Audio {i + 1}/{len(hashes)}: {sha1}', flush=True)
    matrix = np.stack(vectors)
    text_vectors = []
    for tag in tags:
        inputs = processor.tokenizer(tag['prompts'], padding=True, return_tensors='pt')
        with torch.inference_mode():
            features = model.get_text_features(**inputs.to(device)).cpu().numpy()
        text_vectors.append(normalize(np.mean([normalize(v) for v in features], axis=0)))
    scores = matrix @ np.stack(text_vectors).T
    audio_tags = {sha1: assign_tags(row, tags, overrides.get(sha1, {}))
                  for sha1, row in zip(hashes, scores, strict=True)}
    binary = struct.pack('<4sIII', b'SEVB', 1, len(hashes), dimensions) + b''.join(
        bytes.fromhex(sha1) + vector.astype('<f4').tobytes()
        for sha1, vector in zip(hashes, matrix, strict=True))
    vector_hash = hashlib.sha256(binary).hexdigest()
    index = {'schemaVersion': 3, 'version': args.version, 'metadata': metadata,
             'inputs': {'sounds': digest(sounds), 'assets': digest(assets), 'durations': digest(durations),
                        'tags': digest(tags), 'overrides': digest(overrides)},
             'audioTags': audio_tags,
             'tags': [{'id': t['id'], 'textKey': t['textKey']} for t in tags],
             'vectorHash': vector_hash, 'sample': bool(args.limit)}
    generation = digest(index)
    index['generation'] = generation
    directory = resource / args.version
    directory.mkdir(parents=True, exist_ok=True)
    vector_name = 'vectors.sample.bin' if args.limit else 'vectors.bin'
    index_name = 'tags.sample.json' if args.limit else 'tags.json'
    write_binary(directory / vector_name, binary)
    write_json(directory / index_name, index)
    print(f'Saved {sum(bool(cs) for cs in events.values())} events; vectors={len(binary)} bytes; generation={generation}', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Search generation failed: {error}', file=sys.stderr)
        sys.exit(1)
