# ローカル確認手順

すべてリポジトリルートで実行します。

## Viteへの移行状況

既存50ファイルのTypeScript化とvanilla-extractへのスタイル移行を実装し、旧style.cssを削除しました。MVP構成への整理も完了し、Model・View・Presenter・Infrastructure・Appへ責務を分けています。2026-11-09にユーザーの動作確認結果を受け、今回の移行作業を完了しました。検証範囲は[MVP整理計画の完了記録](mvp-refactoring-plan.md#完了記録2026-11-09)を参照してください。

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

- `test`: `tests/` 配下のNodeテスト。層間の依存方向と循環参照も検査します。専用ローダーで.css.tsのファイルスコープを設定し、実際のクラス名exportを読み込みます。CSSの描画は行わず、CSS生成はViteビルドで検証します。
- `verify:data`: 先頭バージョンの実データを使い、検索・Worker・チェックサムを検証します。
- `typecheck`: アプリ・Worker・ツールを検査し、Model・Presenter・ContractsはDOMライブラリなしでも型チェックします。
- `build`: 型チェック、Viteビルド、`resource/`から`dist/resource/`への配布データコピーを行います。公開用音声の圧縮はPythonで実行します。CLAP推論は実行しません。
- `build:deploy`: Python依存のインストール、音声圧縮テスト、Nodeテスト、データ検証、`build`を順に実行します。GitHub ActionsとNetlifyで共通の公開ビルドです。
- `preview`: 生成済みの`dist/`を <http://127.0.0.1:8000/SoundEnum2/> で確認します。ソース変更後は再ビルドが必要です。

生成済み成果物のサイズは、必要に応じて次のコマンドで確認できます。

```powershell
npm run check:pages-size
```

公開容量の検査は `npm run build` の最後に実行し、公開ファイルが1,000,000,000バイトを超える場合は失敗させます。

## TypeScript移行後の注意

ブラウザはTypeScriptを直接実行できないため、PythonのHTTPサーバーでソースを配信する方式は使えません。ローカル確認には`npm run dev`を使います。

Node.jsは型を除去して実行するだけなので、テスト成功は型チェック成功を意味しません。変更後は型チェックを含む`npm run build`も実行してください。

## 起動時の表示

HTML内に初回描画用の最小CSSを置き、暗い背景と読み込み表示を先に出します。Scripts/App/Bootstrap.tsがモジュールとUIの初期化完了後に画面を表示します。失敗時は再読み込みボタンを表示します。検索インデックスの読み込みは従来どおり画面内で継続します。

## テストの配置

テストケースとNode用CSSローダーは `tests/` にまとめています。テスト名は日本語で記述し、実行結果にも確認内容を表示します。データ生成・更新ツールは引き続き `tools/` に置きます。

Nodeテストは `npm test`、Pythonの更新・検索データ生成テストは次で実行します。Python側は `tools/requirements-clap.txt` の依存環境を使用します。

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
```

## 公開用音声の圧縮

`resource/audio/` は元音源のまま保持します。`npm run dev` では元音源を使い、`npm run build` で生成する `dist/resource/audio/` には比較試聴の圧縮D（OGG Vorbis、compression_level=1.0）を配置します。圧縮後の方が大きい場合は元音源を採用します。

初回のみPython環境を準備してください（既存の `.venv` があれば作成は不要です）。

```powershell
python -m venv .venv
npm run build:deploy
npm run preview
```

ビルドは `.venv` のPythonを優先し、なければPATH上の `python` を使います。別の環境を使う場合は `SOUNDENUM_PYTHON` に実行ファイルのパスを指定できます。

初回は全音声を最大4並列で変換します。2回目以降は `.cache/release-audio/` を再利用します。元音源のSHA-1とキャッシュのSHA-256を検証し、破損したキャッシュは再生成します。設定・ライブラリのバージョンが変わると別のキャッシュを使います。このキャッシュと `dist/` はGitには登録しません。

公開音声のファイル名は元音源のハッシュを識別子として維持しますが、圧縮後の内容のSHA-1とは一致しません。サンプル数・サンプルレート・チャンネル数は維持し、検索ベクトル・タグ・波形は元音源から生成したものを使います。検索用データの再生成や元音源の検証には `dist/` を使わないでください。

GitHub Actionsは同じビルド手順で圧縮し、容量チェックを通った `dist/` だけを公開します。元音源・圧縮キャッシュ・Python環境は公開対象に含めません。通常どおりmainへの反映で公開でき、LFSや別サービスの設定は不要です。

## GitHub Pagesへの公開

設定ボタンの上に、`Build:` に続けてビルド元のコミットハッシュを8桁で表示します。文字は小さく、色は通常の本文色に揃えます。リンクは付けず、ホバーで完全なハッシュを確認できます。Actionsでは `GITHUB_SHA`、Netlifyでは `COMMIT_REF`、ローカルではビルド時の `git rev-parse HEAD` をHTMLに埋め込むため、公開後にブランチが進んでも表示は変わりません。ローカルの未コミット変更はハッシュに含まれません。開発サーバーでは起動時のハッシュを使うため、コミット後に表示を更新するにはサーバーを再起動してください。

`.github/workflows/deploy-pages.yml` がmainへのpush（PRのマージを含む）で実行されます。Node.jsは `.node-version` に合わせ、依存インストール、Nodeテスト、検索データ検証、型チェック、本番ビルドの成功後に `dist/` を公開します。公開用音声はビルド時にPythonで圧縮します。Actionsが必要な依存を準備し、圧縮結果をキャッシュします。CLAP推論は不要です。

初回はGitHubのリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。Environmentの公開ブランチ制限を設定している場合は、`github-pages` でmainを許可します。独自のシークレットやアクセストークンは不要です。

公開先は `https://yohanemc480.github.io/SoundEnum2/` です。Viteの基準パス `/SoundEnum2/` をそのまま使用します。NetlifyのPRプレビューとは独立しており、developや作業ブランチへのpushではPagesを更新しません。

再実行は **Actions → GitHub Pagesへ公開 → Run workflow** でmainを選びます。ワークフローをmainへ反映してから実行してください。main以外を選んだ場合は公開をスキップします。

## 公開ビルドの共通設定

GitHub ActionsとNetlifyは、同じ `npm run build:deploy`（`tools/build_deploy.mjs`）を実行します。依存準備・テスト・検証・ビルドの手順を変更するときは、この共通処理を更新してください。各公開先の設定には、実行環境の準備・キャッシュ・アップロードなど公開先固有の処理だけを置きます。

- Node.jsのバージョン: `.node-version`
- Pythonのバージョン: `runtime.txt`（Netlifyの形式に合わせ、バージョン番号のみ・末尾改行なし）
- 公開音声用のPython依存: `tools/requirements-release-audio.txt`
- JavaScript依存: `package.json` / `package-lock.json`

Netlifyは `netlify.toml` のコマンドでビルドし、`dist` を公開します。リポジトリルートをBase directoryとして使ってください。Netlifyの環境では公開パスを `/`、GitHub Pagesと通常のローカル環境では `/SoundEnum2/` に切り替えます。Netlify側に個別のPythonバージョン指定がある場合は、`runtime.txt` と競合しないよう解除してください。

音声変換キャッシュのビルド間の保存はGitHub Actionsに設定しています。Netlifyではキャッシュ保存を追加していないため、ビルド環境にキャッシュがなければ全音声を変換します。公開先への反映・デプロイ結果はそれぞれの管理画面で確認してください。
