# サウンド情報の更新

リポジトリのルートで実行します（Python 3、インターネット接続が必要）。

```powershell
python tools/update_sounds.py
```

最新正式版の情報をMojangから取得し、`resource/<バージョン>/hash.json` と `resource/<バージョン>/sounds.json` に保存します。
音声も `resource/audio/<ハッシュ>.ogg` に保存し、すべての取得・検証後に `Scripts/Constants/SoundResourcePaths.js` のバージョンを切り替えます。
過去のファイルは残し、同名ファイルの内容が異なる場合は上書きせずエラーにします。

音声は保存済みの正常なファイルを再利用し、未取得・破損分だけを1件ずつ取得します。途中で失敗しても再実行できます。
初回は26.3で約377 MB・4,961音声の取得が必要です。JSON取得の4リクエストに加え、必要な音声ごとに1リクエスト発生します。

ローカル再生の前にこのコマンドを実行し、公開時は `resource/audio/` も配置してください。再生時にMojangへアクセスするフォールバックはありません。

再生時間もOGGから集計し、`resource/<バージョン>/durations.json` に保存します。保存済み音声だけから再集計する場合（通信なし）：

```powershell
python tools/build_durations.py
```

バージョン固有のJSONと検索データは `resource/<バージョン>/` にまとめます。現在保持するバージョンは26.3のみです。音声はバージョン間で共有するため `resource/audio/` に保持します。
