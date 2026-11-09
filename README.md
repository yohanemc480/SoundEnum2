# Minecraft Sound Browser

Minecraft Java Editionのサウンドを検索・試聴し、`playsound`コマンドを作成できるWebアプリです。似た音を探したり、複数の音を重ねて効果音の組み合わせを試したりできます。

**[Webアプリを開く](https://yohanemc480.github.io/SoundEnum2/)**

## できること

- **サウンド検索**：サウンドIDの部分一致、類似音、タグで絞り込み。複数タグはすべて一致する条件で検索できます。
- **単音試聴**：波形を見ながら再生・シーク・音量調整。複数の音声候補を持つサウンドは、候補を指定して試聴することもできます。
- **コマンド作成**：ソース・音量・ピッチ・最低音量を設定して、`playsound`コマンドをコピーできます。
- **組み合わせ試聴**：最大10音を同時に再生。音ごとにコマンド設定を変更でき、各コマンドをまとめてコピーできます。
- **お気に入り・組み合わせ保存**：サウンドIDのお気に入り登録と、最大30件の組み合わせ保存に対応。組み合わせは名前変更・上書き・呼び出しができます。
- **バージョン切り替え**：生成済みのバージョンから選択し、そのバージョンのサウンドを検索できます。選択可能な版は[バージョン一覧](resource/available-versions.json)で管理しています。

検索結果の＋ボタンで音を追加し、「組み合わせ試聴」の「現在の組み合わせを保存」を押すと、組み合わせタブに保存されます。

お気に入り、組み合わせ、検索条件、選択バージョン・タブ、コマンド設定はブラウザのローカルストレージに保存します。端末・ブラウザ間の同期はありません。設定メニューから保存データを削除できます。

## 使用しているリソース

### Minecraftのサウンドデータ

更新スクリプトはMojangのバージョン一覧・アセット一覧を参照し、指定バージョンのサウンド定義とOGG音声を取得します。

- バージョン情報：`piston-meta.mojang.com`の公式バージョンマニフェスト
- サウンド定義・音声：`resources.download.minecraft.net`のアセット
- 音声候補のピッチ・音量・選択時の重み：サウンド定義に含まれる値を使用

取得した音声はサイト内から配信します。試聴のたびにMojangの配信サーバーから音声を取得する構成ではありません。

### 類似音・タグ検索

音声とテキストの特徴を扱うCLAPモデル `laion/clap-htsat-unfused` を、PythonのTransformers・PyTorch経由で使用しています。

音声の特徴ベクトルとタグは事前生成し、ブラウザでは生成済みデータを読み込んで検索します。ブラウザ内でCLAPモデルを実行する必要はありません。

- 類似度は音声ベクトルのコサイン類似度を元にした値で、確率や一致率ではありません。
- 検索は原音ベースで、画面で変更したピッチ・音量は類似度に反映しません。
- タグは「爆発・足音・ガラス・衝撃・金属・石・声・水・木」の9種類。テキストとの類似度による自動判定で、必ず正しい分類になるものではありません。
- タグの定義は[tools/sound-tags.json](tools/sound-tags.json)、音声単位の補正は[tools/sound-tag-overrides.json](tools/sound-tag-overrides.json)で管理しています。

複数候補を持つサウンドでは、類似度・タグは条件に一致した候補の評価です。短冊のクリック再生は全候補から重み付きで抽選するため、検索で評価された候補と異なる音が鳴る場合があります。特定の候補を確認するには候補一覧から試聴してください。

### データの配置

| 配置 | 内容 |
| --- | --- |
| `resource/<version>/sound-events.json` | サウンドIDと候補音の定義。公式データの候補表記をオブジェクト形式に統一 |
| `resource/<version>/audio-file-hashes.json` | 音声ファイルのパスとSHA-1ハッシュの対応 |
| `resource/<version>/audio-tags.json` | 音声ごとのタグと検索データの検証情報 |
| `resource/<version>/audio-embeddings.bin` | 音声ハッシュとCLAP特徴ベクトル |
| `resource/audio/<hash>.ogg` | バージョン間で共有する音声ファイル |
| `resource/audio-durations.json` | 音声ハッシュごとの再生時間 |
| `resource/audio-waveform-peaks.json` | 波形表示用に事前生成したピーク値 |
| `resource/available-versions.json` | 選択可能なバージョンの一覧 |

同じ音声はハッシュ単位で共有し、再生時間・波形もバージョンごとに重複して保持しない構成です。

## ローカルで動かす

Vite・TypeScriptへの移行を進めています。npmでの起動・検証方法と現在の移行状況は[ローカル確認手順](docs/local-development.md)、全体の手順は[移行計画](docs/typescript-migration-plan.md)を参照してください。


HTML・CSS・JavaScriptで構成された静的サイトです。生成済みリソースがあれば、フロントエンドのビルドやCLAPの導入は不要です。

リポジトリのルートで次を実行し、<http://localhost:8000> を開きます。

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

詳しい操作は[ローカル確認手順](docs/local-development.md)を参照してください。

## バージョンのリソースを生成する

初回はリポジトリのルートでPython環境と依存ライブラリを用意します。以下はWindowsでの例です。

```powershell
python -m venv .venv
python -m pip --python .venv/Scripts/python.exe install -r tools/requirements-clap.txt
.venv/Scripts/python.exe tools/update_sounds.py 26.3
```

バージョンを引数で指定すると、音声の取得、再生時間・波形・検索データの生成を行い、成功後にバージョンの選択肢へ追加します。初回はモデルの取得と音声解析に時間がかかります。再実行時は取得済み音声・解析済みキャッシュを再利用します。

## クレジット

Minecraftのサウンド・名称などはMojang Studios / Microsoftおよび各権利者に帰属します。本アプリは非公式のプロジェクトです。

内部のプロジェクト名はSoundEnumです。
