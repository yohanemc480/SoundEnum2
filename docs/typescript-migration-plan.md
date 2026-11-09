# TypeScript・Vite・vanilla-extract 移行計画

作成日: 2026-11-09
状態: TypeScript・vanilla-extractへの移行と、その後のMVP構成への整理は完了。2026-11-09にユーザーから動作確認で問題ない旨の報告を受けた。公開容量確認・GitHub Pages設定は引き続き保留。

## 今回の区切りと保留事項

ユーザーの方針により、これ以降の作業は今回の実施対象から外す。以下は将来再開する際の参考として残し、自動的に着手しない。

- 公開成果物の容量確認と、必要な場合のリソース配信方針の検討。
- GitHub Pagesのビルド・デプロイ設定と公開確認。

移行時点では型チェック・36テスト・本番ビルドが成功。その後の最終検証と動作確認の範囲は[MVP整理計画の完了記録](mvp-refactoring-plan.md#完了記録2026-11-09)を参照。以下の実施記録は当時の状況を保持し、保留した公開作業を完了済みとは扱わない。

## 実施記録（2026-11-09）

- Layout.css.tsへ共通レイアウト・配色・レスポンシブ指定の残り67ルールを移行。固定HTMLのクラス付与と動的要素・CSS間の参照を生成識別子へ統一し、style.cssとHTMLのlinkを削除。既存の詳細度と宣言順を確認。
- 型チェック・36テスト・本番ビルドとリソースコピーを通過。全data-*-style指定をexportと照合。ブラウザ回帰確認は未実施のため、移行全体の完了判定は保留。

- SearchControls.css.tsへ検索フォーム・タブ・ページ切り替え・入力クリア操作の33ルールを移行。ApplySearchStylesで固定HTMLに生成クラスを付与し、選択状態と画面幅ごとの配置を維持。
- 型チェック・36テスト・本番ビルドとリソースコピーを通過。HTMLのスタイル指定をexportと照合。ブラウザでの見た目と操作は未確認。

- Playback.css.tsへ再生パネルの配置・ボタン・波形・時間・ローディングと400px幅の配置を移行。アイコンは生成クラス、回転アニメーションはkeyframesで参照。固定HTML/SVGはApplyPlaybackStylesで初期化する。ID指定のルールは詳細度維持のためglobalStyleに移行。
- 型チェック・36テスト・本番ビルドとリソースコピーを通過。HTMLのスタイル指定をexportと照合。ブラウザでの見た目と操作は未確認。

- InputFields.css.tsへ設定入力欄のレイアウト・ラベル・共通input/selectスタイルとフォーカス表示を移行。設定と音量パネルの参照を生成クラスへ変更し、1400px/560pxのレイアウト条件も移行。全入力に共通の要素セレクターにはglobalStyleを使用。
- 型チェック・36テスト・本番ビルドとリソースコピーを確認。ブラウザでの見た目と操作は未確認。

- OutputArea.css.tsへコマンド出力欄を移し、VolumeControl.css.tsへ音量パネルの基本スタイルと動きを減らす設定を移行。旧CSSの10ルールを削除。DOM検索はpreview-output IDとdata-volume-controlへ変更し、コピー操作の親セレクターも生成クラス参照に統一。
- 型チェック・36テスト・本番ビルドとリソースコピーを通過。ブラウザでの見た目と操作は未確認。

- Settings.css.tsへ共通設定ボタン・閉じるアイコン・設定ポップオーバーの21ルールを移行。静的HTMLのdata-settings-styleは初期化時に検証して生成クラスへ変換し、動的UIと関連セレクターも定数参照へ変更。
- 型チェック・36テスト・本番ビルドとリソースコピーを通過。HTMLのスタイル指定がexportに存在することを確認。ブラウザ動作は未確認。

- CopyButton.css.ts、SoundAutocomplete.css.ts、ConfirmDialog.css.tsへコピー・入力候補・確認／名前入力ダイアログを移行。要素にstyle()のクラスを直接付与し、閉じる状態とkeyframesも生成識別子で参照。旧CSSの25行を削除。
- 型チェック・36テスト・本番ビルドとリソースコピーを通過。ブラウザでの見た目と操作は未確認。

- Compositions.css.tsへ組み合わせ編集行・操作ボタン・保存カードなど26ルールを移行。SoundComposition、SavedCompositionsと検索側の選択解除・強調セレクターを生成クラス参照に更新。HTML上のパネル配置や共通ボタンのスタイルは後続で移行する。
- 型チェック・36テスト・本番ビルドとリソースコピーを通過。ブラウザでの見た目と操作は未確認。

- SearchResults.css.tsへ検索結果・お気に入りの行、タグ、候補ポップオーバー、選択表示など33ルールを移行。生成クラスの付与と検索を型付き参照へ切り替え、旧CSSから対応ルールを削除。組み合わせの選択表示と900px/560pxのレスポンシブ条件も維持。
- 型チェック・36テスト・本番ビルドとリソースコピーを通過。ブラウザでの見た目と操作は未確認。

- vanilla-extractのViteプラグインを導入。Toast.css.ts、Playback.css.ts、VolumeControl.css.tsで通知・再生状態・音量パネル開閉とスライダーを移行し、旧CSSルールを削除。クラスを型付きimportで参照する。
- Nodeテスト用の.css.tsローダーを追加。型チェック・36テスト・本番ビルドとリソースコピーを通過し、生成CSSの状態セレクターを確認。ブラウザでの見た目と操作は未確認。

- 手元のnpm installが成功し、package-lock.jsonを生成。ブラウザ・Worker・Node設定の型チェック、Vite本番ビルドとresourceコピー、36テスト、実データ検証（1,984イベント・4,941音源）がすべて成功。以下の依存取得待ちの記録は当時の状況。

- package.json、Nodeバージョン、Vite設定、JS混在のTypeScript設定を追加。
- WorkerのURLをViteが検出できる直接記述へ変更し、手書きrevisionを除去。
- 配布データのコピーと、公開前に任意実行する容量検査を追加。
- 既存31テストと実データ検証（1,984イベント・4,941音源）が通過。
- npm installはregistry.npmjs.orgのENOTFOUNDで失敗。lockfile生成、型チェック、Viteによるビルド・previewは未完了。
- 最後の2ファイル（Main、SoundSearchBrowser）をTS化。既存50ファイルすべてを移行し、追加2ファイルを含むTSは52ファイル。HTMLの起動先をMain.tsへ変更し、allowJs/checkJs設定を削除。
- 検索結果・候補再生・DOM参照を型付けし、タグの表示文言と要素の欠落を検証。36テストと実データ検証を通過。型チェック・Viteビルド・ブラウザ確認は依存取得待ちのため未検証であり、移行全体は未完了。
- 組み合わせ再生・保存一覧の2ファイル（SoundComposition、SavedCompositions）をTS化。既存48ファイルを移行済み、追加2ファイルを含めTSは50ファイル。残りのJSはMain、SoundSearchBrowserの2ファイル。
- 保存データ・再生候補・Web Audioノード・UIコールバックを型付けし、DOM要素と再生データの欠落を検証。36テストと実データ検証を通過。静的型チェック・Viteビルド・ブラウザ動作は依存取得待ちで未検証。
- コマンド出力・候補入力の2ファイル（OutputArea、SoundAutocomplete）をTS化。既存46ファイルを移行済み、追加2ファイル込みでTSは48ファイル。残りのJSはMain、SavedCompositions、SoundComposition、SoundSearchBrowserの4ファイル。
- 出力要素・入力欄・候補配列を型付けし、DOM参照や候補が存在しない場合を処理。36テストと実データ検証が通過。候補選択や出力表示の実ブラウザ確認と静的型チェック・Viteビルドは未検証。
- 波形・再生UI4ファイル（PreviewWaveform、CompositionWaveform、SearchWaveforms、PreviewPlayer）をTS化。既存44ファイルを移行済み、追加2ファイル込みでTSは46ファイル。残りのJSはMain、OutputArea、SavedCompositions、SoundAutocomplete、SoundComposition、SoundSearchBrowserの6ファイル。
- Canvas・音声要素・波形配列・Observer・タイマーとフレームIDを型付け。描画コンテキストやキュー要素の欠落を処理し、シーク入力の値を文字列として設定する。
- 36テストと実データ検証が通過。ドラッグ操作・波形描画の実ブラウザ確認、静的型チェック、Viteビルドは依存取得後に実施する。
- 設定・ダイアログ関連4ファイル（ConfirmDialog、SoundSettings、VersionSelector、SelectMasterVolumeArea）をTS化。既存40ファイルを移行済み、共通定義を含めTSは42ファイル。残りのJSは10ファイル。
- 確認と文字入力のPromise戻り値を区別し、設定コールバック・数値入力・DOMイベントを型付け。バージョン一覧はunknownから検証。HTML入力要素のvalue/min/maxは文字列として設定する。
- 設定保存を含む36テストと実データ検証が通過。静的型チェック・ブラウザ表示・Viteビルドは未検証。
- 共通UI9ファイル（Text、ApplyText、CopyButton、CopyCommand、Toast、BrowserTabs、RevealAddedItem、BindSettingsPopover、SettingsPopovers）をTS化。既存36ファイルを移行済み、追加2ファイルを含めTSは38ファイル。残りのJSは14ファイル。
- 文言関数の引数型、DOM参照と属性値の検証、タブIDの型を追加。HTMLのSettingsPopoversエントリーも.tsへ更新。Toastのクラス化など設計変更は実施していない。
- 共通UI移行後も36テストと実データ検証が通過。ブラウザでの表示・操作、静的型チェック、Viteビルドは依存取得後の確認事項。
- 再生関連6ファイル（MCRawSound、MCCommandSound、SingletonBase、ResourceManager、SoundManager、WaveformResource）をTS化。既存27ファイルを移行済み、追加2ファイルを含めTSは29ファイル。
- 既存の共有インスタンス生成方式を維持し、派生クラスごとの型を宣言。MCCommandSoundの誤ったsource定数名をMasterへ修正し、未定義ハッシュでのURL生成を防止。波形JSONはunknownから検証する。
- 再生のピッチ・音量、ダウンロードの切り替え、HTTPエラー、ハッシュ欠落のテストを追加。36テストと実データ検証が通過。静的型チェックとViteビルドは依存取得後に実施する。
- リソース・Worker関連6ファイル（ResourceBase、NetworkFileLoader、MCSoundHashResource、MCPlaysoundCommandParamResource、SoundSearchResource、SoundSearchWorker）をTS化。既存ファイル21個を移行済み、追加ファイル込みで23個のTSファイル。
- ResourceData.tsで外部JSONをunknownから検証。Worker要求・応答型とtsconfig.worker.jsonを追加し、ブラウザとWorkerの型チェック環境を分離。
- Worker初期化失敗時の古い状態の破棄と、postMessage失敗時のpending解放を実装。34テストと実データ検証が通過。静的型チェックとViteビルドは依存未取得のため未検証。
- 検索処理4ファイル（ResolveSoundEvents、BuildSearchEvents、SearchVectors、SoundSearchEngine）をTS化。SearchTypes.tsにイベント・候補音・検索条件・検索結果の共通型を追加。既存ファイル15個を移行済み、型定義の新規ファイルを含めて16個のTSファイル。
- 検索処理の移行後も既存31テストと実データ検証が通過。この段階ではWorker側はJSだったが、上記のリソース移行でTS化・通信型・JSON検証を追加した。型チェックとViteビルドは依存未取得のため未検証。
- 保存処理4ファイル（LocalStorage、LocalStorageSchema、Favorites、SearchPreferences）をTS化。保存データをunknownで受け取り、実行時検証後に型を確定する。保存キー・JSON形式は維持。
- この段階で移行済みは計11ファイル。今回も既存31テストと実データ検証が通過。npmレジストリへの接続は引き続き失敗しており、静的型チェック・ブラウザビルドは未検証。
- 基礎処理7ファイル（Constantsの4ファイル、FormatSoundCommand、SelectWeightedCandidate、ResourcePathProvider）をTS化。定数のリテラル型、コマンドの引数型、抽選のジェネリック、バージョンのreadonlyフィールドを導入。
- JS/テストのimportを`.ts`へ更新し、Node.js 24の型除去で既存31テスト・実データ検証が通過。これは静的型チェックの代替ではない。
- NodeテストとViteの両方で同じソースを読めるよう、移行対象のimportには`.ts`を明記し、allowImportingTsExtensionsを設定する（当初の拡張子なし方針を変更）。
- 依存取得後は型チェックと第1段階のVite実動検証を優先する。vanilla-extract、残りのTS化、GitHub Actionsは未完了。
- 現在の相対リソースURLはサブパス配下のページから解決する方式を維持している。パス集約は今後の工程。

以下のチェックリストは段階全体の完了時に更新する。

## 目的と範囲

既存の動作と保存データを維持しながら、フロントエンドをTypeScriptへ移行する。Viteで開発・ビルドを行い、vanilla-extractによってコードから参照するスタイル名を型で検証できる構成にする。成果物は静的ファイルとしてGitHub Pagesへ配信する。

Toast固有のクラス化・共有インスタンス化は今回の対象外。現状の設計を維持し、移行に必要な型付けとスタイル参照の変更だけを行う。MVP化、全体のDI化、メソッド名の一括変更、UI機能追加も分離する。

## 現状の確認

- `Scripts/`には50個のJavaScriptファイルがある。ES Modulesで、`index.html`から`Main.js`と`SettingsPopovers.js`を読み込む。
- npmの構成とリポジトリ内のGitHub Actionsワークフローは未導入。現在のGitHub側のPages公開設定は未確認。
- `style.css`にスタイルが集約され、JS側から文字列でクラスを付け外ししている。
- `resource/`は8,819ファイル、1,201,415,715バイト（約1.20GB）。全ファイルがGit追跡対象。
- `ResourcePathProvider.js`、`SharedAudioPaths`、`VersionSelector.js`にリソースパスがある。
- `SoundSearchResource.js`はURLを変数に格納・加工してWorkerを生成する。Viteの静的解析に合う形へ変更が必要。
- WorkerのURLと`SoundSearchEngine.js`のimportにキャッシュ回避用のrevisionがある。
- `tests/test_*.mjs`はNodeのテストランナーとJSへの直接importを使用する。`verify_search_data.mjs`はNode Workerで実データを検証する。
- Pythonによる音源・検索データの生成は、フロントエンドのビルドとは独立している。

## 採用する構成

| 項目 | 方針 |
| --- | --- |
| 開発・配布 | Vite。最初は既存JSをそのまま動かす |
| 型チェック | TypeScriptのstrictを有効にし、Viteとは別に`tsc --noEmit`を実行 |
| 段階移行 | 一時的に`allowJs: true`、`checkJs: false`でJSとTSを混在。移行済みTSには厳格な検査を適用 |
| スタイル | vanilla-extractと公式Viteプラグイン。既存CSSと共存し、機能単位で置き換える |
| テスト | 既存アサーションを活かし、フロントエンドテストをVitestへ移行。CSS importもVite経由で処理 |
| データ生成 | Pythonツールと`resource/`の元データ配置は維持 |
| 公開 | GitHub Actionsで検証・ビルド後、`dist/`だけをPagesへ配信 |
| 依存バージョン | 導入時に互換性のある安定版を選び、Nodeのバージョンとlockfileを固定 |

`Scripts/`は初期段階では移動しない。ファイル名変更・型付けと、大規模なディレクトリ再編を同時に行わない。

## 第1段階: 既存JSのままViteで動かす

- [ ] `package.json`、lockfile、`vite.config.ts`を追加する。
- [ ] `dev`、`build`、`preview`のnpmスクリプトを用意する。
- [ ] `node_modules/`、`dist/`、必要なテスト生成物を`.gitignore`へ追加する。
- [ ] `base`を通常のPages公開先に合わせて`/SoundEnum2/`にする。開発時とpreviewでも同じサブパスで確認する。
- [ ] HTMLの2つのエントリーポイントを維持する。Mainのトップレベルawaitと既存の初期化順序が動くbuild targetを選ぶ。
- [ ] Worker生成を`new Worker(new URL('./SoundSearchWorker.js', import.meta.url), { type: 'module' })`の直接記述へ変更する。
- [ ] Worker関連の手書きrevisionを除去し、ビルド生成名による更新へ移行する。
- [ ] JSON・OGG・binの動的なパスは自動バンドルされないため、ビルド後に`resource/`を`dist/resource/`へコピーするNodeスクリプトを用意する。元データは移動しない。
- [ ] コピー範囲は配布データだけとし、リポジトリルートをpublicDirに指定しない。開発中はViteのルート配下のresourceを利用する。
- [ ] リソースURLの組み立てはResourcePathProvider側へ集約する。ベースパスを引数で受け、起動側から`import.meta.env.BASE_URL`を渡す。Nodeテストからも呼べる純粋なパス生成にする。
- [ ] VersionSelector用のバージョン一覧、共有音源・波形も同じベースパス規則にそろえる。
- [ ] faviconを含め、HTMLから参照する静的ファイルの出力を確認する。

完了条件: 開発サーバーとビルド後previewの両方で、初期表示・検索Worker・試聴・バージョン切替が動く。サブパス配下でリソース404がない。既存テストが通る。

## 第2段階: TypeScriptとテストの基盤

- [ ] アプリ用、Worker用、Node上の設定・テスト用の型チェック範囲を分ける。DOMとWebWorkerのグローバル型を無条件に混ぜない。
- [ ] strict、noEmit、isolatedModules、bundler向けmoduleResolutionを設定する。環境に合わせてDOM・ES・Viteの型を指定する。
- [ ] `typecheck`を追加し、`build`は型チェック成功後にViteを実行する。Vite単体の成功を型チェック成功とは扱わない。
- [ ] 相対importはNodeテストでも直接解決できるよう`.ts`を明記する。Workerのnew URLには実ファイル名を記述し、TS化時に`.ts`へ変える。
- [ ] 既存フロントエンドテストをVitestに移し、`node:assert/strict`のアサーションやデータfixtureを再利用する。node:testの登録をVitestのtestへ変更する。
- [ ] Node環境を既定とし、DOMが必要なテストだけDOM環境を使う。グローバルの書き換え・AudioContextのモックは各テスト後に復元する。
- [ ] ソースファイル名を読むテストやWorkerを直接importするテストを棚卸しし、TS化に追従させる。
- [ ] `verify_search_data.mjs`は別の統合検証コマンドとして維持する。TS化後は検証用Workerを一時出力へビルドしてNode Workerから実行する構成に変更し、HTTP→ローカルファイルのマッピングもサブパスに対応させる。

完了条件: JS混在状態でtypecheck・既存回帰テスト・buildを実行できる。Nodeによるデータ検証とブラウザWorkerの検証手順が明確である。

## 第3段階: データ・処理から順にTS化

次の順序で、小さな変更単位ごとに型チェックと関連テストを通す。

| 順序 | 主な対象 | 型付けの重点 |
| --- | --- | --- |
| 1 | Constants、Text、FormatSoundCommand、SelectWeightedCandidate、ResourcePathProvider | 定数のリテラル型、引数・戻り値、文言キー |
| 2 | LocalStorageSchema、LocalStorage、Favorites、SearchPreferences | 保存データ型、既存データの正規化、ジェネリックな読み書き |
| 3 | ResolveSoundEvents、BuildSearchEvents、SearchVectors、SoundSearchEngine | 生JSONと内部データの区別、候補音・検索結果・バイナリ |
| 4 | ResourceBase、各Resource、NetworkFileLoader、SoundSearchWorker | 非同期戻り値、エラー、Worker通信 |
| 5 | MCCommandSound、MCRawSound、Singletons、再生・波形関連 | Audio API、状態のnull許容、タイマー・非同期競合 |
| 6 | 設定・ダイアログ・コピー・Toast・一覧・保存UI・Main | DOM型、イベント、初期化順序 |

- [ ] 外部JSON・localStorageは`unknown`として受け、既存の検証・正規化を型ガードや戻り値型に結び付ける。型アサーションだけで安全とみなさない。
- [ ] Workerメッセージをinit/searchと成功/失敗の判別可能なunionにし、呼び出し側と共有する。
- [ ] Map・Promise・コールバック・クラスフィールドを明示的に型付けし、暗黙anyを解消する。
- [ ] DOM参照のnullや要素種別を確認する。無条件の`!`、`as any`、`@ts-ignore`で一括回避しない。
- [ ] 移行途中のJS境界は型保証が限定されることを認識し、依存先を順にTS化する。
- [ ] localStorageのキーとJSON形式、音源・検索データのスキーマを維持する。
- [ ] 日本語辞書のキーとアルファベット順を維持する。

完了条件: `Scripts/`の対象JSがTSになり、allowJsを除去しても型チェックが成功する。機能ごとの回帰テストが通る。

## 第4段階: vanilla-extractへスタイルを段階移行

この段階は第2段階の後、TS化済みの機能から第3段階と交互に進められる。

- [x] `@vanilla-extract/css`と公式Viteプラグインを追加する。
- [ ] 機能ごとに`.css.ts`を置き、`style()`が返すクラス名をimportして使う。
- [ ] JSから付け外しする状態クラスを優先して移す。名前を別途文字列定数にする方式にはしない。
- [ ] HTMLに直接書かれたクラスは、移行対象ごとに初期化時のクラス付与へ変更する。DOM検索用ID・ARIA属性と装飾用クラスを区別する。
- [ ] CSSクラスでDOM検索している箇所も追従させ、旧クラス名への参照を残さない。
- [ ] 基本スタイルと状態スタイルの詳細度・読み込み順を設計する。旧IDセレクターが生成クラスを上書きしないよう、対応する旧ルールを同時に削除する。
- [ ] CSS変数、メディアクエリ、疑似要素、アニメーションを機能単位で移す。画面全体のテーマ値は必要に応じて共通化する。
- [ ] bodyなど構造要素の共通スタイルはglobalStyleへ移す。動的な状態クラスをglobalStyleの文字列で再定義しない。
- [ ] 全ルールの移行後にstyle.cssとHTMLのlinkを削除する。

完了条件: アプリ独自の動的な装飾クラスは生成した識別子経由で参照される。export名のタイプミスは型エラーになる。見た目・再表示・レスポンシブ表示を実ブラウザで確認する。

型で保証するのは識別子の存在とスタイル宣言の型であり、DOMへの付与忘れやCSSの優先順位まで保証するものではない。

## 第5段階: GitHub Pagesのビルド公開と容量対策（保留・今回の対象外）

重要: GitHub公式の公開サイト上限は1GB。現在のresource全体は約1.20GBのため、そのままコピーした成果物のPages公開は保証できない。これはTSやvanilla-extractの制約とは別の、既存データ配信の問題である。

- [ ] 全配布ファイルの合計と内訳を計測する。未参照音源・不要な生成物があるか調べ、必要データだけをコピーしてどこまで減るか確認する。
- [ ] サイズ検査をビルド・CIに追加し、上限を超える成果物を公開しない。圧縮アーカイブのサイズだけで判断しない。
- [ ] 必須データだけでも上限を超える場合は、音源等を別ホスティングへ分離するか、公開バージョンを絞るかをユーザーと決める。バージョン・音源を無断で削減しない。この判断はローカルでのTS移行を止めない。
- [ ] 外部配信を選ぶ場合はURL基点、CORS、fetch・Web Audioでの取得を確認する。フロントエンド本体はPagesに残せる。
- [ ] `.github/workflows/deploy.yml`を用意し、npm ci → 型チェック・テスト → build → サイズ・参照検査 → distのアップロード → Pages配信を行う。
- [ ] PRでは検証だけ、mainへのpushと手動起動で配信する構成にする。Nodeバージョン、権限、Pages environment、同時デプロイ制御を設定する。
- [ ] GitHub側の現行設定を確認し、公開切替時にPagesのSourceをGitHub Actionsへ変更する。
- [ ] Pythonの音源生成・CLAP推論は通常の公開ビルドに含めない。

完了条件: 配信容量の方針が解決済みで、本番サブパスからJS・CSS・Worker・JSON・bin・OGGが取得できる。通常の更新がpushから公開まで完了する。

## 回帰確認と完了条件

各段階で変更した範囲のテストを行い、最終段階で次を一巡する。

- [ ] 型チェック・全フロントエンドテスト・本番ビルドが成功する。
- [ ] 実データ検証で検索件数・類似順序・タグ・ベクトルのチェックサムが維持される。
- [ ] 一覧、文字検索、タグAND、類似検索、複数候補除外、バージョン切替が動く。
- [ ] 試聴、停止、シーク、音量・ピッチ、波形表示と組み合わせ再生が動く。
- [ ] コマンド生成・コピー・通知、設定・ダイアログが動く。
- [ ] 移行前の保存データでお気に入り・履歴・設定・保存した組み合わせを復元できる。
- [ ] Worker停止・読み込み失敗・壊れた保存データの扱いが維持される。
- [ ] 本番成果物のpreviewでネットワーク404とコンソールエラーがない。通常幅と狭い画面で見た目を確認する。
- [ ] README、AGENTS.md、docs/local-development.mdにnpmによる起動・型チェック・テスト・ビルド・停止方法を反映する。変更した検証コマンドを関連ドキュメントにも反映する。

## 作業の分割と戻し方

第1段階、第2段階、第3段階の各グループ、第4段階の各機能、第5段階を独立したコミット単位にする。公開設定の切替は成果物検証と容量対策の後に行う。問題が出た場合は直前の変更単位を戻せるよう、保存形式の変更と移行を混在させない。

最初に着手する実装は「既存JSをViteで開発・ビルドできる状態にする」。初回から全ファイルのTS化やスタイル変換をまとめて行わない。

## 公式資料

- [Vite: TypeScriptとWorker](https://vite.dev/guide/features)
- [Vite: 静的ファイル](https://vite.dev/guide/assets)
- [Vite: GitHub Pagesへの公開](https://vite.dev/guide/static-deploy)
- [vanilla-extract: Vite連携](https://vanilla-extract.style/documentation/integrations/vite/)
- [vanilla-extract: テスト環境](https://vanilla-extract.style/documentation/test-environments/)
- [GitHub Pagesの制限](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
