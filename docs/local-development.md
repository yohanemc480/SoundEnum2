# ローカル確認手順

すべてリポジトリルートで実行します。

## Viteへの移行状況

ViteとTypeScriptの設定を追加しています。依存パッケージ取得後にビルド検証を行う段階です。既存のJSとCSSはそのまま残っており、全ファイルのTS化・vanilla-extractへの移行はまだ完了していません。

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

- `test`: 既存の31件のNodeテスト。TS化にあわせてテスト環境も移行します。
- `verify:data`: 先頭バージョンの実データを使い、検索・Worker・チェックサムを検証します。
- `typecheck`: TS設定と移行済みTSを検査します。現段階のJSは`checkJs: false`なので厳格な検査の対象外です。
- `build`: 型チェック、Viteビルド、`resource/`から`dist/resource/`への配布データコピーを行います。Pythonによるデータ生成は実行しません。
- `preview`: 生成済みの`dist/`を <http://127.0.0.1:8000/SoundEnum2/> で確認します。ソース変更後は再ビルドが必要です。

GitHub Pagesへの公開前には、生成済み成果物のサイズを確認します。

```powershell
npm run check:pages-size
```

公開容量の検査はローカルビルドから分けています。上限超過時もローカルで移行を検証できます。公開設定の変更やデプロイはまだ行っていません。

## 移行中に従来方式で確認する

現状のJS・CSSは次の方法でも確認できます。TSやvanilla-extractをアプリから利用する段階ではVite方式に切り替えます。

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

<http://localhost:8000> を開きます。変更の反映は`Ctrl+R`、必要に応じて`Ctrl+F5`。停止は`Ctrl+C`です。
