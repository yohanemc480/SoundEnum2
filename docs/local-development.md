# ローカル確認手順

すべてリポジトリルートで実行します。

## Viteへの移行状況

既存50ファイルすべてをTypeScriptへ移行し、共通型とJSON検証の2ファイルを追加しています。HTMLの起動先もMain.tsへ変更しました。依存パッケージ取得後に静的型チェックとViteビルドを検証する段階で、vanilla-extractへのCSS移行は未着手です。

Node.js 24.13.0を使用します（`.node-version`参照）。初回は次を実行します。

```powershell
npm install
npm run dev
```

開発URLは <http://127.0.0.1:8000/SoundEnum2/> です。保存した変更はViteが反映します。停止はターミナルで`Ctrl+C`です。同じポートのPythonサーバーが起動している場合は先に停止してください。

初回の依存解決が成功したら、生成された`package-lock.json`をコミットします。それ以降のクリーンインストール・CIでは`npm ci`を使います。現環境ではnpmレジストリの名前解決に失敗しており、lockfileは未生成です。

## 検証とビルド

```powershell
npm test
npm run verify:data
npm run typecheck
npm run build
npm run preview
```

- `test`: 36件のNodeテスト。TS化にあわせてテスト環境も移行します。
- `verify:data`: 先頭バージョンの実データを使い、検索・Worker・チェックサムを検証します。
- `typecheck`: Scripts内の全TSファイルを検査します。JS混在用の設定は削除しています。
- `build`: 型チェック、Viteビルド、`resource/`から`dist/resource/`への配布データコピーを行います。Pythonによるデータ生成は実行しません。
- `preview`: 生成済みの`dist/`を <http://127.0.0.1:8000/SoundEnum2/> で確認します。ソース変更後は再ビルドが必要です。

GitHub Pagesへの公開前には、生成済み成果物のサイズを確認します。

```powershell
npm run check:pages-size
```

公開容量の検査はローカルビルドから分けています。上限超過時もローカルで移行を検証できます。公開設定の変更やデプロイはまだ行っていません。

## TypeScript移行後の注意

ブラウザはTypeScriptを直接実行できないため、PythonのHTTPサーバーでソースを配信する方式は使えません。Viteの依存取得が完了するまでは、Node.jsによる`npm test`と`npm run verify:data`で処理を検証できます。

Node.jsは型を除去して実行するだけなので、テスト成功は型チェック成功を意味しません。依存取得後に`npm run typecheck`と`npm run build`を実行してください。
