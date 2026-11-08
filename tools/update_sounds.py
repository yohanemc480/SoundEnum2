"""指定バージョンの音声・検索リソースを生成し、選択可能なバージョン一覧へ登録する。"""

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
from tempfile import NamedTemporaryFile
from concurrent.futures import ThreadPoolExecutor, as_completed
from sound_search_data import write_json
from build_durations import build_durations
from build_waveforms import build_waveforms
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_URL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
ASSET_BASE_URL = "https://resources.download.minecraft.net"


def download_json(url, sha1=None):
    """JSONを取得し、指定されていればSHA-1を検証する。"""
    with urlopen(url, timeout=30) as response:
        data = response.read()
    if sha1 and hashlib.sha1(data).hexdigest() != sha1:
        raise ValueError("Downloaded file failed SHA-1 validation")
    return json.loads(data), data


def fetch_version(version):
    """指定されたバージョンを公式一覧から取得する。"""
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", version):
        raise ValueError("Invalid version")
    manifest, _ = download_json(MANIFEST_URL)
    entry = next((v for v in manifest["versions"] if v["id"] == version), None)
    if entry is None:
        raise ValueError(f"Unknown Minecraft version: {version}")
    return entry


def normalize_sounds(sounds):
    """候補音をオブジェクトに統一し、既定値の省略とイベント参照を保持する。"""
    normalized = {}
    for name, event in sounds.items():
        normalized[name] = dict(event)
        if "sounds" in event:
            normalized[name]["sounds"] = [
                {"name": candidate} if isinstance(candidate, str) else dict(candidate)
                for candidate in event["sounds"]
            ]
    return normalized


def fetch_sound_resources(entry):
    """正式版の詳細、アセット一覧、サウンド定義の順に取得する。"""
    metadata, _ = download_json(entry["url"], entry.get("sha1"))
    index_info = metadata["assetIndex"]
    index, index_bytes = download_json(index_info["url"], index_info["sha1"])
    sound_hash = index["objects"]["minecraft/sounds.json"]["hash"]
    sounds, _ = download_json(
        f"https://resources.download.minecraft.net/{sound_hash[:2]}/{sound_hash}",
        sound_hash,
    )
    if not isinstance(sounds, dict) or not sounds:
        raise ValueError("Empty or invalid sounds.json")
    sound_bytes = (json.dumps(normalize_sounds(sounds), ensure_ascii=False, indent=2) + "\n").encode()
    hashes = {name: asset["hash"] for name, asset in index["objects"].items()
              if name.startswith("minecraft/sounds/") and name.endswith(".ogg")}
    hash_bytes = (json.dumps(hashes, ensure_ascii=False, indent=2) + "\n").encode()
    return {"hash": hash_bytes, "sounds": sound_bytes}, index_bytes


def find_new_resource_files(root, version, resources):
    """既存ファイルとの不一致を検出し、新規保存するファイルだけを返す。"""
    files = []
    for suffix, content in resources.items():
        filename = {"hash": "audio-file-hashes.json", "sounds": "sound-events.json"}[suffix]
        name = f"{version}/{filename}"
        target = root / "resource" / name
        if target.exists():
            if json.loads(target.read_bytes()) != json.loads(content):
                raise ValueError(f"resource/{name} already exists with different data")
        else:
            files.append((target, content))
    return files


def save_resource_files(files):
    """既存ファイルを上書きせず、新しいバージョンのJSONを保存する。"""
    for target, content in files:
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("xb") as output:
            output.write(content)
        print(f"Saved resource/{target.parent.name}/{target.name}")


def collect_audio_assets(index_bytes):
    """音声だけを抽出し、同じハッシュのファイルをまとめる。"""
    objects = json.loads(index_bytes)["objects"]
    assets = {}
    for name, asset in objects.items():
        if name.startswith("minecraft/sounds/") and name.endswith(".ogg"):
            if not re.fullmatch(r"[0-9a-f]{40}", asset["hash"]):
                raise ValueError("Invalid audio hash")
            assets[asset["hash"]] = asset["size"]
    if not assets:
        raise ValueError("No audio assets found")
    return assets


def audio_file_is_valid(path, sha1, size):
    """保存済み音声のサイズとハッシュを確認し、再取得の要否を判定する。"""
    if not path.is_file() or path.stat().st_size != size:
        return False
    digest = hashlib.sha1()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest() == sha1


def download_audio_file(target, sha1, size):
    """一時ファイルに音声を取得し、検証が成功した場合だけ保存する。"""
    temporary = None
    try:
        with urlopen(f"{ASSET_BASE_URL}/{sha1[:2]}/{sha1}", timeout=30) as response:
            with NamedTemporaryFile(dir=target.parent, suffix=".tmp", delete=False) as output:
                temporary = Path(output.name)
                for chunk in iter(lambda: response.read(1024 * 1024), b""):
                    output.write(chunk)
        if not audio_file_is_valid(temporary, sha1, size):
            raise ValueError(f"Audio validation failed: {sha1}")
        temporary.replace(target)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def save_audio_files(root, index_bytes):
    """未取得・破損した音声を最大4件並列で取得する。"""
    assets = collect_audio_assets(index_bytes)
    directory = root / "resource" / "audio"
    directory.mkdir(parents=True, exist_ok=True)
    pending = [
        (directory / f"{sha1}.ogg", sha1, size)
        for sha1, size in assets.items()
        if not audio_file_is_valid(directory / f"{sha1}.ogg", sha1, size)
    ]
    total = len(pending)
    cached = len(assets) - total

    def progress(completed):
        filled = 24 if total == 0 else completed * 24 // total
        percent = 100 if total == 0 else completed * 100 // total
        print(f"\rAudio [{'#' * filled}{'-' * (24 - filled)}] {percent:3d}% {completed}/{total} (cached: {cached})", end="", flush=True)

    progress(0)
    executor = ThreadPoolExecutor(max_workers=4)
    futures = []
    try:
        futures = [executor.submit(download_audio_file, *item) for item in pending]
        for completed, future in enumerate(as_completed(futures), 1):
            future.result()
            progress(completed)
    finally:
        for future in futures:
            future.cancel()
        executor.shutdown(wait=True, cancel_futures=True)
        print(flush=True)


def sort_available_versions(versions):
    """公式のリリース日時で新しい順に並べる。"""
    manifest, _ = download_json(MANIFEST_URL)
    entries = {entry['id']: entry for entry in manifest['versions']}
    missing = set(versions) - entries.keys()
    if missing:
        raise ValueError(f"Unknown versions in catalog: {sorted(missing)}")
    from datetime import datetime
    return sorted(versions, key=lambda v: (datetime.fromisoformat(entries[v]['releaseTime']), v), reverse=True)


def update(version, root=ROOT):
    """取得・検証・保存を順に行い、最後に選択可能なバージョン一覧へ登録する。"""
    entry = fetch_version(version)
    resources, index_bytes = fetch_sound_resources(entry)

    catalog = root / "resource" / "available-versions.json"
    versions = json.loads(catalog.read_bytes()) if catalog.exists() else []
    if not isinstance(versions, list) or any(not isinstance(v, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", v) for v in versions) or len(set(versions)) != len(versions):
        raise ValueError("Invalid available versions")
    ordered_versions = sort_available_versions(list(dict.fromkeys([*versions, version])))
    files = find_new_resource_files(root, version, resources)

    # 全リソースの生成後に選択肢へ登録する。
    save_audio_files(root, index_bytes)
    build_durations(root, version, resources["hash"])
    build_waveforms(root, version, resources["hash"])
    save_resource_files(files)
    # 同じPython環境で検索データまで生成し、失敗時は選択肢へ登録しない。
    subprocess.run(
        [sys.executable, str(root / "tools" / "build_similarity.py"), version],
        cwd=root, check=True,
    )
    if ordered_versions != versions:
        write_json(catalog, ordered_versions)
    print(f"Resources ready: {version}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("version", help="生成するMinecraftバージョン（例: 26.3）")
    args = parser.parse_args()
    try:
        update(args.version)
    except Exception as error:
        print(f"Update failed: {error}", file=sys.stderr)
        sys.exit(1)
