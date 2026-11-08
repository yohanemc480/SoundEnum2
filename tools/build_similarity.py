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


def encode_audio_batches(items, load_audio, infer, normalize, window, batch_size):
    """音声をまたいで区間をまとめ、音声ごとの加重平均を返す。"""
    import numpy as np
    pending, owners, states = [], [], {}

    def flush():
        features = infer(pending)
        if len(features) != len(pending):
            raise ValueError('Unexpected embedding batch size')
        finished = []
        for (key, weight, last), feature in zip(owners, features, strict=True):
            vector = normalize(feature)
            total, length = states.get(key, (np.zeros_like(vector, dtype=np.float64), 0))
            states[key] = (total + vector.astype(np.float64) * weight, length + weight)
            if last:
                total, length = states.pop(key)
                finished.append((key, normalize(total / length)))
        pending.clear()
        owners.clear()
        return finished

    for key in items:
        audio = load_audio(key)
        for start in range(0, len(audio), window):
            chunk = audio[start:start + window]
            pending.append(chunk)
            owners.append((key, len(chunk), start + window >= len(audio)))
            if len(pending) == batch_size:
                yield from flush()
    if pending:
        yield from flush()


def show_progress(label, completed, total):
    filled = completed * 24 // total if total else 24
    percent = completed * 100 // total if total else 100
    print(f"\r{label} [{'#' * filled}{'-' * (24 - filled)}] {percent:3d}% {completed}/{total}", end='', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('version')
    parser.add_argument('--batch-size', type=int, default=4, help='CLAPで同時処理する10秒区間数（既定: 4）')
    parser.add_argument('--limit', type=int, help='検証用。通常の検索データを更新しない')
    parser.add_argument('--revision', default=REVISION, help='CLAPモデルのcommit')
    parser.add_argument('--offline', action='store_true', help='取得済みモデルのみ使用する')
    parser.add_argument('--validate-only', action='store_true', help='モデル不要で参照整合性を検証')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9._-]+', args.version):
        parser.error('Invalid version')
    if args.limit is not None and args.limit < 1:
        parser.error('limit must be positive')
    if args.batch_size < 1:
        parser.error('batch-size must be positive')
    resource = ROOT / 'resource'
    read = lambda p: json.loads(p.read_bytes())
    sounds = read(resource / args.version / 'sound-events.json')
    assets = read(resource / args.version / 'audio-file-hashes.json')
    all_durations = read(resource / 'audio-durations.json')
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

    vectors, missing = {}, []
    print(f'CLAP: {device}, batch={args.batch_size}', flush=True)
    try:
        for i, sha1 in enumerate(hashes, 1):
            try:
                vector = np.asarray(read(cache / cache_key / f'{sha1}.json'), dtype=np.float32)
                if (vector.shape != (dimensions,) or not np.isfinite(vector).all()
                        or abs(float(np.linalg.norm(vector)) - 1) > 1e-5):
                    raise ValueError('Invalid cached embedding')
                vectors[sha1] = vector
            except (OSError, ValueError, TypeError):
                missing.append(sha1)
            show_progress('CLAP cache', i, len(hashes))
    finally:
        print(flush=True)

    def load_audio(sha1):
        audio, source_rate = sf.read(resource / 'audio' / f'{sha1}.ogg', dtype='float32', always_2d=True)
        audio = audio.mean(axis=1)
        if not len(audio) or not np.isfinite(audio).all():
            raise ValueError(f'Invalid audio: {sha1}')
        divisor = math.gcd(source_rate, rate)
        return resample_poly(audio, rate // divisor, source_rate // divisor)

    def infer(chunks):
        inputs = processor.feature_extractor(chunks, sampling_rate=rate, return_tensors='pt')
        with torch.inference_mode():
            return model.get_audio_features(**inputs.to(device)).cpu().numpy()

    completed = len(vectors)
    show_progress('CLAP audio', completed, len(hashes))
    try:
        for sha1, vector in encode_audio_batches(missing, load_audio, infer, normalize, window, args.batch_size):
            write_json(cache / cache_key / f'{sha1}.json', vector.tolist())
            vectors[sha1] = vector
            completed += 1
            show_progress('CLAP audio', completed, len(hashes))
    finally:
        print(flush=True)
    matrix = np.stack([vectors[sha1] for sha1 in hashes])
    text_vectors = []
    try:
        for number, tag in enumerate(tags, 1):
            inputs = processor.tokenizer(tag['prompts'], padding=True, return_tensors='pt')
            with torch.inference_mode():
                features = model.get_text_features(**inputs.to(device)).cpu().numpy()
            text_vectors.append(normalize(np.mean([normalize(v) for v in features], axis=0)))
            show_progress("CLAP tags", number, len(tags))
    finally:
        print(flush=True)
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
    vector_name = 'audio-embeddings.sample.bin' if args.limit else 'audio-embeddings.bin'
    index_name = 'audio-tags.sample.json' if args.limit else 'audio-tags.json'
    write_binary(directory / vector_name, binary)
    write_json(directory / index_name, index)
    print(f'Saved {sum(bool(cs) for cs in events.values())} events; vectors={len(binary)} bytes', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Search generation failed: {error}', file=sys.stderr)
        sys.exit(1)
