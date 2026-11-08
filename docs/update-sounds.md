# サウンド情報の更新

リポジトリのルートで実行します（Python 3、インターネット接続が必要）。

```powershell
python tools/update_sounds.py
```

最新正式版の情報をMojangから取得し、`resource/<バージョン>hash.json` と `resource/<バージョン>sounds.json` に保存します。
両方の取得・検証後、`Scripts/Constants/SoundResourcePaths.js` のバージョンを同じサイト内の新しいファイルに切り替えます。
過去のファイルは残し、同名ファイルの内容が異なる場合は上書きせずエラーにします。
