"""指定した複数バージョンと、それらだけが参照するリソースを一括削除する。"""

import argparse
import json
from pathlib import Path
import re
import sys

from sound_search_data import write_json

ROOT = Path(__file__).resolve().parents[1]


def validate_version(version):
    """リソースディレクトリ名として安全なバージョンだけを許可する。"""
    if not isinstance(version, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', version):
        raise ValueError(f'Invalid version: {version!r}')


def checked_path(resource, path):
    """リンクやジャンクションによる別ディレクトリへの読み書きを拒否する。"""
    if path.resolve() != path.absolute() or not path.resolve().is_relative_to(resource):
        raise ValueError(f'Unsafe resource path: {path}')
    return path


def read_hashes(resource, version):
    """参照表全体を検証し、不明な参照を未使用と扱わず停止する。"""
    validate_version(version)
    path = checked_path(resource, resource / version / 'audio-file-hashes.json')
    data = json.loads(path.read_bytes())
    if not isinstance(data, dict) or not data or any(
        not name.startswith('minecraft/sounds/') or not name.endswith('.ogg')
        or not isinstance(value, str) or not re.fullmatch(r'[0-9a-f]{40}', value)
        for name, value in data.items()
    ):
        raise ValueError(f'Invalid audio hashes: {path}')
    return set(data.values())


def remove(*target_versions, root=ROOT, apply=False):
    """対象版をまとめて集計し、apply時だけ削除する。更新・生成処理との同時実行は禁止。"""
    if not target_versions:
        raise ValueError('Specify at least one version')
    for version in target_versions:
        validate_version(version)
    target_versions = list(dict.fromkeys(target_versions))
    target_set = set(target_versions)
    resource = Path(root).resolve() / 'resource'
    checked_path(resource, resource)
    catalog = checked_path(resource, resource / 'available-versions.json')
    versions = json.loads(catalog.read_bytes())
    if not isinstance(versions, list):
        raise ValueError('Invalid available versions')
    for item in versions:
        validate_version(item)
    if len(set(versions)) != len(versions):
        raise ValueError('Duplicate available versions')
    remaining = [item for item in versions if item not in target_set]
    if not remaining:
        raise ValueError('Cannot remove the last available version')

    # 各版の参照表を一度だけ読み、削除対象全体の和集合を作る。
    target_hashes = set()
    for version in target_versions:
        target_hashes.update(read_hashes(resource, version))
    retained_hashes = set()
    # 登録済み全版に加え、更新途中などの未登録版の参照も保護する。
    retained_versions = set(remaining)
    for directory in resource.iterdir():
        if directory.is_dir() and directory.name not in target_set and directory.name != 'audio':
            if (directory / 'audio-file-hashes.json').exists():
                retained_versions.add(directory.name)
    for retained in sorted(retained_versions):
        retained_hashes.update(read_hashes(resource, retained))
    unused = target_hashes - retained_hashes

    directories = [checked_path(resource, resource / version) for version in target_versions]
    version_files = [path for directory in directories for path in sorted(directory.iterdir())]
    for path in version_files:
        checked_path(resource, path)
        if not path.is_file():
            raise ValueError(f'Unexpected version directory entry: {path}')
    audio_files = []
    for sha1 in sorted(unused):
        path = checked_path(resource, resource / 'audio' / f'{sha1}.ogg')
        if path.exists():
            if not path.is_file():
                raise ValueError(f'Expected audio file: {path}')
            audio_files.append(path)

    updates = []
    for filename in ('audio-durations.json', 'audio-waveform-peaks.json'):
        path = checked_path(resource, resource / filename)
        if not path.exists():
            continue
        data = json.loads(path.read_bytes())
        if not isinstance(data, dict):
            raise ValueError(f'Invalid shared data: {filename}')
        values = data
        if filename == 'audio-waveform-peaks.json':
            if data.get('schemaVersion') != 1 or not isinstance(data.get('waveforms'), dict):
                raise ValueError('Invalid waveform data')
            values = data['waveforms']
        removed = unused.intersection(values)
        for sha1 in removed:
            del values[sha1]
        if removed:
            updates.append((path, data))
        print(f'{filename}: remove {len(removed)} entries')

    files = audio_files + version_files
    size = sum(path.stat().st_size for path in files)
    print(f'Versions: {", ".join(target_versions)}; retained versions: {len(retained_versions)}')
    print(f'Exclusive hashes: {len(unused)}; shared hashes kept: {len(target_hashes & retained_hashes)}')
    print(f'Delete: {len(audio_files)} audio files, {len(version_files)} version files ({size:,} bytes)')
    for path in files:
        print(f'  {path.relative_to(resource.parent).as_posix()}')
    if not apply:
        print('Preview only. Use --apply to delete.')
        return

    # 一覧から先に外し、削除途中の版が新規に選択されることを防ぐ。
    # 全版の参照表を音声・共有JSONの処理完了まで残し、途中失敗時の再集計に備える。
    write_json(catalog, remaining)
    for path, data in updates:
        write_json(path, data)
    hash_files = {directory / 'audio-file-hashes.json' for directory in directories}
    for path in files:
        if path not in hash_files:
            path.unlink()
    for directory in directories:
        (directory / 'audio-file-hashes.json').unlink()
        directory.rmdir()
    print(f'Removed resources: {", ".join(target_versions)}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('versions', nargs='+', help='削除するMinecraftバージョン（例: 26.2 26.1）')
    parser.add_argument('--apply', action='store_true', help='確認表示だけでなく削除を実行する')
    args = parser.parse_args()
    try:
        remove(*args.versions, apply=args.apply)
    except Exception as error:
        print(f'Remove failed: {error}', file=sys.stderr)
        sys.exit(1)
