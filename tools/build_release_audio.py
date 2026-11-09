"""元音源を保持し、公開用の音声を最大圧縮してdistへ配置する。"""

from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import shutil
from tempfile import NamedTemporaryFile

import numpy as np
import soundfile as sf

from sound_search_data import write_json

ROOT = Path(__file__).resolve().parents[1]
COMPRESSION_LEVEL = 1.0


def file_digest(path, algorithm='sha256'):
    """大きな音源も一定のメモリ使用量で検証する。"""
    digest = hashlib.new(algorithm)
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def transcode(source, destination, level=COMPRESSION_LEVEL):
    """形式と全サンプルの正常性を検証してから、変換結果を確定する。"""
    info = sf.info(source)
    temporary = None
    try:
        with NamedTemporaryFile(dir=destination.parent, suffix='.ogg', delete=False) as output:
            temporary = Path(output.name)
        with sf.SoundFile(source) as audio, sf.SoundFile(
            temporary, mode='w', samplerate=info.samplerate, channels=info.channels,
            format='OGG', subtype='VORBIS', compression_level=level,
        ) as output:
            for block in audio.blocks(blocksize=65536, dtype='float32', always_2d=True):
                if not np.isfinite(block).all():
                    raise ValueError(f'Invalid source samples: {source}')
                output.write(block)
        converted = sf.info(temporary)
        if (converted.frames, converted.samplerate, converted.channels) != (info.frames, info.samplerate, info.channels):
            raise ValueError(f'Audio format or duration changed: {source}')
        for block in sf.blocks(temporary, blocksize=65536, dtype='float32'):
            if not np.isfinite(block).all():
                raise ValueError(f'Invalid decoded samples: {source}')
        temporary.replace(destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def prepare_audio(source, cache, previous):
    """元音源のSHA-1とキャッシュを検証し、小さい方の音声を再利用可能にする。"""
    sha1 = file_digest(source, 'sha1')
    if sha1 != source.stem:
        raise ValueError(f'Source audio hash mismatch: {source.name}')
    target = cache / source.name
    original_size = source.stat().st_size
    if isinstance(previous, dict) and target.is_file() and previous.get('sha256') == file_digest(target):
        return target, previous, True
    transcode(source, target)
    # ごく短い効果音などで再圧縮が逆効果なら、元音源を公開する。
    compressed = target.stat().st_size < original_size
    if not compressed:
        shutil.copyfile(source, target)
    return target, {'sha256': file_digest(target), 'originalBytes': original_size,
                    'bytes': target.stat().st_size, 'compressed': compressed}, False


def build(root=ROOT):
    """最大4並列で変換し、検証済みキャッシュからdistにだけ音声をコピーする。"""
    resource = root / 'resource'
    output = root / 'dist' / 'resource' / 'audio'
    if not (root / 'dist' / 'index.html').is_file():
        raise ValueError('Run the Vite build before preparing release audio')
    # 設定やエンコーダーが変わったら古い圧縮結果を再利用しない。
    settings = f'v1-{COMPRESSION_LEVEL}-{sf.__version__}-{sf.__libsndfile_version__}-{np.__version__}'
    cache = root / '.cache' / 'release-audio' / settings
    cache.mkdir(parents=True, exist_ok=True)
    manifest = cache / 'manifest.json'
    previous = {}
    if manifest.exists():
        try:
            previous = json.loads(manifest.read_bytes())
        except (ValueError, OSError):
            pass
    if not isinstance(previous, dict):
        previous = {}
    sources = sorted((resource / 'audio').glob('*.ogg'))
    if not sources:
        raise ValueError('No source audio found')
    referenced = set()
    for index in resource.glob('*/audio-file-hashes.json'):
        referenced.update(json.loads(index.read_bytes()).values())
    missing = referenced - {source.stem for source in sources}
    if missing:
        raise ValueError(f'Missing referenced audio: {sorted(missing)[:5]}')
    output.mkdir(parents=True, exist_ok=True)
    results = {}
    reused = 0
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(prepare_audio, source, cache, previous.get(source.name)): source for source in sources}
        try:
            for future in as_completed(futures):
                source = futures[future]
                path, metadata, cached = future.result()
                shutil.copyfile(path, output / source.name)
                results[source.name] = metadata
                reused += cached
                if len(results) % 100 == 0 or len(results) == len(sources):
                    write_json(manifest, {**previous, **results})
                    print(f'Release audio: {len(results)}/{len(sources)} (cached: {reused})', flush=True)
        except BaseException:
            for future in futures:
                future.cancel()
            write_json(manifest, {**previous, **results})
            raise
    write_json(manifest, results)
    original_bytes = sum(item['originalBytes'] for item in results.values())
    release_bytes = sum(item['bytes'] for item in results.values())
    kept = sum(not item['compressed'] for item in results.values())
    print(f'Release audio: {original_bytes:,} -> {release_bytes:,} bytes; kept original: {kept}', flush=True)


if __name__ == '__main__':
    build()
