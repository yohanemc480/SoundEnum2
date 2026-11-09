"""BGMとアンビル設置音を再圧縮し、元音源を変更せず聴き比べページを作る。"""

import html
import json
import os
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '.cache' / 'audio-compression'
LEVELS = [
    ('medium', '圧縮A', 0.6),
    ('small', '圧縮B', 0.8),
    ('strong', '圧縮C（強）', 0.95),
    ('maximum', '圧縮D（最大）', 1.0),
]


def transcode(source, destination, level):
    """サンプルレート・チャンネル数を維持してVorbisに変換し、デコード結果を検証する。"""
    info = sf.info(source)
    with sf.SoundFile(source) as audio, sf.SoundFile(
        destination, mode='w', samplerate=info.samplerate, channels=info.channels,
        format='OGG', subtype='VORBIS', compression_level=level,
    ) as output:
        for block in audio.blocks(blocksize=65536, dtype='float32', always_2d=True):
            output.write(block)
    converted = sf.info(destination)
    if (converted.frames, converted.samplerate, converted.channels) != (info.frames, info.samplerate, info.channels):
        raise ValueError(f'Audio format or duration changed: {destination}')
    for block in sf.blocks(destination, blocksize=65536, dtype='float32'):
        if not np.isfinite(block).all():
            raise ValueError(f'Invalid decoded samples: {destination}')


def player(path, label, original_size):
    """サイズ・削減率・再生元表示を添え、メタデータだけ先読みするプレイヤーを返す。"""
    size = path.stat().st_size
    url = Path(os.path.relpath(path, OUTPUT)).as_posix()
    return f'''<div class="variant"><h3>{html.escape(label)}</h3>
<p>{size / 1000:,.1f} KB · 削減率 {100 * (1 - size / original_size):.1f}%</p>
<audio controls preload="metadata" src="{html.escape(url, quote=True)}"></audio>
<p class="source">ファイル: {html.escape(path.name)}</p>
<p class="status" aria-live="polite">読み込み待ち</p></div>'''


def main():
    """最大のBGMと最新登録版のアンビル設置音を四段階で変換し、比較結果を保存する。"""
    resource = ROOT / 'resource'
    versions = json.loads((resource / 'available-versions.json').read_bytes())
    names = {}
    for version in versions:
        for name, sha1 in json.loads((resource / version / 'audio-file-hashes.json').read_bytes()).items():
            names.setdefault(sha1, name)
    music = max(
        (resource / 'audio' / f'{sha1}.ogg' for sha1, name in names.items() if '/music/' in name),
        key=lambda path: path.stat().st_size,
    )
    latest = json.loads((resource / versions[0] / 'audio-file-hashes.json').read_bytes())
    anvil = resource / 'audio' / f"{latest['minecraft/sounds/random/anvil_land.ogg']}.ogg"
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sections = []
    results = []
    for key, title, source in [('music', 'BGM', music), ('anvil', 'アンビル設置音', anvil)]:
        size = source.stat().st_size
        info = sf.info(source)
        players = [player(source, '元音源', size)]
        result = {'name': names[source.stem], 'hash': source.stem, 'originalBytes': size,
                  'seconds': info.duration, 'sampleRate': info.samplerate, 'channels': info.channels,
                  'variants': []}
        for suffix, label, level in LEVELS:
            destination = OUTPUT / f'{key}-{suffix}.ogg'
            transcode(source, destination, level)
            players.append(player(destination, label, size))
            result['variants'].append({'label': label, 'compressionLevel': level,
                                       'bytes': destination.stat().st_size})
        results.append(result)
        sections.append(f'''<section data-seek="{'true' if key == 'music' else 'false'}"><h2>{title}</h2><p>{html.escape(names[source.stem])}</p>
<p>{info.duration:.3f} 秒 / {info.samplerate} Hz / {info.channels} ch</p>
<div class="players">{''.join(players)}</div></section>''')
        print(json.dumps(result, ensure_ascii=False), flush=True)
    (OUTPUT / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    page = '''<!doctype html><html lang="ja"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>音声圧縮の聴き比べ</title>
<style>body{background:#161a22;color:#eef1f7;font:16px/1.6 system-ui;margin:32px auto;padding:0 20px;max-width:1100px}
section{background:#232a36;padding:24px;margin:24px 0;border-radius:14px}h1,h2,h3{margin:0 0 12px}
.players{display:flex;flex-wrap:wrap;gap:24px}.variant{flex:1;min-width:260px}audio{width:100%}p{overflow-wrap:anywhere;color:#c2cbdc}</style>
<h1>音声圧縮の聴き比べ</h1><p>元音源と圧縮A・B・C・Dを聴き比べてください。C・Dはさらに強い圧縮です。
別のプレイヤーを再生すると、前の音を止めます。各プレイヤーのシーク位置は独立しています。</p>
<label><input id="sync-seek" type="checkbox"> BGMの切り替え時に再生位置を引き継ぐ</label>
<p>形式はすべてOGG Vorbis。音量補正・リサンプリング・チャンネル変更はしていません。
アンビルはゲーム側の音量係数を適用せず、音声ファイルそのものを比較します。
Aは圧縮レベル0.6、Bは0.8、Cは0.95、Dは1.0（この設定の上限）です。
この数値は容量の削減率ではありません。音質の良否は実際に聴いて判断してください。</p>
''' + ''.join(sections) + '''<script>
document.querySelectorAll('section').forEach(section => {
  let previous = null;
  section.querySelectorAll('audio').forEach(audio => {
    const status = audio.parentElement.querySelector('.status');
    audio.addEventListener('loadedmetadata', () => { status.textContent = '読み込み済み'; });
    audio.addEventListener('error', () => {
      status.textContent = '音声を読み込めません。リポジトリ内の比較ページを直接開いてください。';
    });
    audio.addEventListener('playing', () => {
      // 宣言されたURLだけでなく、ブラウザが実際に選択した再生元を表示する。
      status.textContent = '再生中: ' + decodeURIComponent(audio.currentSrc.split('/').pop());
    });
    audio.addEventListener('pause', () => { status.textContent = '一時停止'; });
    audio.addEventListener('ended', () => { status.textContent = '再生終了'; });
    audio.addEventListener('play', () => {
    if (previous && previous !== audio && section.dataset.seek === 'true'
        && document.querySelector('#sync-seek').checked) {
      const position = previous.ended ? 0 : previous.currentTime;
      // 初回の再生ではメタデータ取得後に同じ位置へ移動する。
      if (audio.readyState >= 1) audio.currentTime = Math.min(position, audio.duration);
      else audio.addEventListener('loadedmetadata', () => {
        audio.currentTime = Math.min(position, audio.duration);
      }, { once: true });
    }
    document.querySelectorAll('audio').forEach(other => { if (other !== audio) other.pause(); });
    previous = audio;
    });
  });
});
</script></html>'''
    (OUTPUT / 'index.html').write_text(page, encoding='utf-8')
    print(f'Comparison: {OUTPUT / "index.html"}')


if __name__ == '__main__':
    main()
