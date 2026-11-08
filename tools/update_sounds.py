"""Java版の最新正式版のサウンド情報を取得し、SoundResourcePaths.jsの参照先を切り替える。"""

import hashlib
import json
from pathlib import Path
import re
import sys
from tempfile import NamedTemporaryFile
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_URL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"


def download_json(url, sha1=None):
    """JSONを取得し、指定されていればSHA-1を検証する。"""
    with urlopen(url, timeout=30) as response:
        data = response.read()
    if sha1 and hashlib.sha1(data).hexdigest() != sha1:
        raise ValueError("Downloaded file failed SHA-1 validation")
    return json.loads(data), data


def fetch_latest_release():
    """バージョン一覧から最新正式版のエントリーを取得する。"""
    manifest, _ = download_json(MANIFEST_URL)
    version = manifest["latest"]["release"]
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", version):
        raise ValueError("Invalid release version")
    entry = next(v for v in manifest["versions"] if v["id"] == version)
    if entry["type"] != "release":
        raise ValueError("Expected a stable release")
    return entry


def fetch_sound_resources(entry):
    """正式版の詳細、アセット一覧、サウンド定義の順に取得する。"""
    metadata, _ = download_json(entry["url"], entry.get("sha1"))
    index_info = metadata["assetIndex"]
    index, index_bytes = download_json(index_info["url"], index_info["sha1"])
    sound_hash = index["objects"]["minecraft/sounds.json"]["hash"]
    sounds, sound_bytes = download_json(
        f"https://resources.download.minecraft.net/{sound_hash[:2]}/{sound_hash}",
        sound_hash,
    )
    if not isinstance(sounds, dict) or not sounds:
        raise ValueError("Empty or invalid sounds.json")
    return {"hash": index_bytes, "sounds": sound_bytes}


def build_updated_references(original, version):
    """定義クラスのバージョンだけを置き換え、参照先をまとめて切り替える。"""
    pattern = rb"""(static Version = )['"][^'"\r\n]+['"];"""
    updated, count = re.subn(
        pattern,
        lambda match: match[1] + f'"{version}";'.encode(),
        original,
    )
    if count != 1:
        raise ValueError("Expected exactly one Version in SoundResourcePaths.js")
    return updated


def find_new_resource_files(root, version, resources):
    """既存ファイルとの不一致を検出し、新規保存するファイルだけを返す。"""
    files = []
    for suffix, content in resources.items():
        name = f"{version}{suffix}.json"
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
        with target.open("xb") as output:
            output.write(content)
        print(f"Saved resource/{target.name}")


def replace_definition_file(definition, content):
    """一時ファイルへの書き込みが完了してからSoundResourcePaths.jsを差し替える。"""
    temporary = None
    try:
        with NamedTemporaryFile(dir=definition.parent, suffix=".tmp", delete=False) as output:
            temporary = Path(output.name)
            output.write(content)
        temporary.replace(definition)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def update(root=ROOT):
    """取得・検証・保存を順に行い、最後にアプリの参照先を切り替える。"""
    entry = fetch_latest_release()
    version = entry["id"]
    resources = fetch_sound_resources(entry)

    definition = root / "Scripts" / "Constants" / "SoundResourcePaths.js"
    original = definition.read_bytes()
    updated = build_updated_references(original, version)
    files = find_new_resource_files(root, version, resources)

    # 書き込み前にすべて検証し、両方のファイルを保存してから参照先を切り替える。
    save_resource_files(files)
    if updated != original:
        replace_definition_file(definition, updated)
        print(f"Updated Scripts/Constants/SoundResourcePaths.js to {version}")
    else:
        print(f"Already up to date: {version}")


if __name__ == "__main__":
    try:
        update()
    except Exception as error:
        print(f"Update failed: {error}", file=sys.stderr)
        sys.exit(1)
