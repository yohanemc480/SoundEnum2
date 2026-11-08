"""検索データの整合性検証とイベント参照解決（標準ライブラリのみ）。"""
import hashlib
import json
import math
import re
from pathlib import Path
from tempfile import NamedTemporaryFile


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                     allow_nan=False).encode()).hexdigest()


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                delete=False) as output:
            temporary = Path(output.name)
            json.dump(value, output, ensure_ascii=False, allow_nan=False)
            output.write("\n")
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def write_binary(path, content):
    """同じ世代の再生成中も、読み込み側に途中のバイナリを見せない。"""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with NamedTemporaryFile(dir=path.parent, delete=False) as output:
            temporary = Path(output.name)
            output.write(content)
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def positive(value, field):
    if not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
        raise ValueError(f"Invalid {field}: {value}")
    return value


def resolve_events(sounds, assets, durations):
    resolved = {}

    def resolve(name, stack=()):
        if name in stack:
            raise ValueError(f"Circular event: {' -> '.join((*stack, name))}")
        if name in resolved:
            return resolved[name]
        if name not in sounds:
            raise ValueError(f"Missing event: {name}")
        candidates = []
        for entry in sounds[name].get("sounds", []):
            entry = {"name": entry} if isinstance(entry, str) else entry
            target = entry["name"].removeprefix("minecraft:")
            pitch = positive(entry.get("pitch", 1), "pitch")
            volume = entry.get("volume", 1)
            if not isinstance(volume, (int, float)) or not math.isfinite(volume) or volume < 0:
                raise ValueError(f"Invalid volume: {volume}")
            weight = positive(entry.get("weight", 1), "weight")
            if entry.get("type") == "event":
                for child in resolve(target, (*stack, name)):
                    candidates.append({**child, "pitch": child["pitch"] * pitch,
                                       "volume": child["volume"] * volume,
                                       "weight": child["weight"] * weight,
                                       "duration": child["duration"] / pitch})
            else:
                key = f"minecraft/sounds/{target}.ogg"
                if key not in assets:
                    raise ValueError(f"Missing asset: {name}: {key}")
                sha1 = assets[key]["hash"]
                if not re.fullmatch(r"[0-9a-f]{40}", sha1):
                    raise ValueError(f"Invalid hash: {sha1}")
                duration = durations.get(sha1)
                if duration is None or not math.isfinite(duration) or duration < 0:
                    raise ValueError(f"Missing/invalid duration: {sha1}")
                candidates.append({"name": target, "hash": sha1, "pitch": pitch,
                                   "volume": volume, "weight": weight,
                                   "duration": duration / pitch})
        resolved[name] = candidates
        return candidates

    for name in sorted(sounds):
        resolve(name)
    return resolved


def validate_tags(tags, overrides):
    ids = set()
    for tag in tags:
        if not re.fullmatch(r"[a-z][a-z0-9_]*", tag["id"]) or tag["id"] in ids:
            raise ValueError(f"Invalid/duplicate tag: {tag['id']}")
        ids.add(tag["id"])
        if not tag.get("prompts") or not all(isinstance(x, str) and x for x in tag["prompts"]):
            raise ValueError(f"Missing prompts: {tag['id']}")
        if not -1 <= tag["threshold"] <= 1:
            raise ValueError(f"Invalid threshold: {tag['id']}")
    for sha1, override in overrides.items():
        if not re.fullmatch(r"[0-9a-f]{40}", sha1):
            raise ValueError(f"Invalid override hash: {sha1}")
        add, remove = set(override.get("add", [])), set(override.get("remove", []))
        if add & remove or (add | remove) - ids:
            raise ValueError(f"Conflicting/unknown override: {sha1}")


def assign_tags(scores, tags, override):
    selected = {tag["id"] for tag, score in zip(tags, scores, strict=True)
                if score >= tag["threshold"]}
    return sorted((selected | set(override.get("add", []))) - set(override.get("remove", [])))
