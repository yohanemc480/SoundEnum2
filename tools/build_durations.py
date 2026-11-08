"""保存済みのOGG Vorbisから再生時間を集計する（通信は行わない）。"""
import json
import math
from pathlib import Path
import re
import struct
from tempfile import NamedTemporaryFile

ROOT = Path(__file__).resolve().parents[1]


def vorbis_duration(path):
    """単一Vorbisストリームの最終サンプル位置をサンプルレートで割る。"""
    rate = None
    serial = None
    last = None
    ended = False
    with path.open("rb") as source:
        while True:
            header = source.read(27)
            if not header:
                break
            if len(header) != 27 or header[:5] != b"OggS\x00":
                raise ValueError(f"Invalid Ogg page: {path.name}")
            segments = source.read(header[26])
            payload = source.read(sum(segments))
            if len(segments) != header[26] or len(payload) != sum(segments):
                raise ValueError(f"Truncated Ogg: {path.name}")
            current_serial = header[14:18]
            if serial is None:
                serial = current_serial
                if not payload.startswith(b"\x01vorbis") or len(payload) < 30:
                    raise ValueError(f"Expected Vorbis audio: {path.name}")
                rate = struct.unpack_from("<I", payload, 12)[0]
            if current_serial != serial or ended:
                raise ValueError(f"Multiple streams are unsupported: {path.name}")
            last = struct.unpack_from("<q", header, 6)[0]
            ended = bool(header[5] & 4)
    if not ended or not rate or last is None or last < 0:
        raise ValueError(f"Incomplete Vorbis stream: {path.name}")
    return last / rate


def build_durations(root, version, index_bytes=None):
    """対象バージョンの音声を解析し、ハッシュと秒数の対応を保存する。"""
    index = json.loads(index_bytes or (root / "resource" / version / "audio-file-hashes.json").read_bytes())
    hashes = sorted(set(index.values()))
    target = root / "resource" / "audio-durations.json"
    durations = json.loads(target.read_bytes()) if target.exists() else {}
    if not isinstance(durations, dict):
        raise ValueError("Invalid durations data")
    for sha1 in hashes:
        if not re.fullmatch(r"[0-9a-f]{40}", sha1):
            raise ValueError("Invalid audio hash")
        value = durations.get(sha1)
        if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0:
            continue
        durations[sha1] = vorbis_duration(root / "resource" / "audio" / f"{sha1}.ogg")
    target.parent.mkdir(parents=True, exist_ok=True)
    content = (json.dumps(durations, indent=2) + "\n").encode()
    if not target.exists() or target.read_bytes() != content:
        temporary = None
        try:
            with NamedTemporaryFile(dir=target.parent, delete=False) as output:
                temporary = Path(output.name)
                output.write(content)
            temporary.replace(target)
        finally:
            if temporary is not None and temporary.exists():
                temporary.unlink()
    print(f"Durations: {len(durations)} files -> resource/{target.name}")


if __name__ == "__main__":
    version = json.loads((ROOT / "resource" / "available-versions.json").read_bytes())[0]
    build_durations(ROOT, version)
