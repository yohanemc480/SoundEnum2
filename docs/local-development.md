# ローカル確認手順

すべてリポジトリルートで実行します。

## Viteへの移行状況

既存50ファイルすべてをTypeScriptへ移行し、共通型とJSON検証の2ファイルを追加しています。HTMLの起動先もMain.tsへ変更しました。依存取得・静的型チェック・Viteビルド（リソースコピーを含む）が成功しています。vanilla-extractを導入し、通知・再生パネル・再生状態・音量パネル・検索結果・候補ポップオーバー・組み合わせ編集行・保存カード・コピー操作・入力候補・確認ダイアログ・設定ポップオーバー・共通ボタン・コマンド出力欄・共通入力欄のスタイルを移行しました。残りのCSS移行と移行後のブラウザ動作確認は未完了です。

Node.js 24.13.0を使用します（`.node-version`参照）。クローン後の初回は次を実行します。

```powershell
npm ci
npm run dev
```

開発URLは <http://127.0.0.1:8000/SoundEnum2/> です。保存した変更はViteが反映します。停止はターミナルで`Ctrl+C`です。同じポートのPythonサーバーが起動している場合は先に停止してください。

`package-lock.json`で依存バージョンを固定しています。クリーンインストール・CIでは`npm ci`を使い、依存を更新する際は`npm install`を使います。

## 検証とビルド

```powershell
npm test
npm run verify:data
npm run typecheck
npm run build
npm run preview
```

- `test`: 36件のNodeテスト。専用ローダーで.css.tsのファイルスコープを設定し、実際のクラス名exportを読み込みます。CSSの描画は行わず、CSS生成はViteビルドで検証します。
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

ブラウザはTypeScriptを直接実行できないため、PythonのHTTPサーバーでソースを配信する方式は使えません。ローカル確認には`npm run dev`を使います。

Node.jsは型を除去して実行するだけなので、テスト成功は型チェック成功を意味しません。変更後は`npm run typecheck`と`npm run build`も実行してください。
