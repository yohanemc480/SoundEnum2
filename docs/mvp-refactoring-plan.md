# MVP構成への整理計画

## 目的と範囲

Model・View・Presenterを分離し、HTMLを用意しなくても状態管理と操作の流れを検証できる構成にする。既存の表示、機能、保存データ、リソース形式を維持する。段階1まで実装済み。段階2以降は未着手。

Vite・TypeScript・vanilla-extractを継続する。公開容量の調査、デプロイ、新機能、UIの再設計は対象外。既存のTypeScript移行計画とは別の作業として扱う。

## 役割と依存ルール

| 層 | 責務 | 依存ルール |
| --- | --- | --- |
| Model | データ、状態、計算、入力値の制約 | View・Presenter・Infrastructureの実装に依存しない |
| View | DOM生成・更新、スタイル、入力イベントの通知 | Modelのデータ型とView契約を利用可能。通信・保存・業務判断を行わない |
| Presenter | 操作の調整、非同期処理の進行、Model操作、表示更新 | Modelと契約に依存。具体的なHTML ViewやブラウザAPI実装を参照しない |
| Infrastructure | fetch、Worker、localStorage、音声再生、クリップボード | 契約を実装し、ブラウザ固有の入出力を隠す |
| App | 起動、依存の生成・接続、終了処理 | 各層の実装を組み立てる。機能の判断処理を持ち込まない |

- Model・Presenterに `document`、`window`、`HTMLElement`、`MouseEvent`、CSS、`HTMLAudioElement`、`AudioContext` を渡さない。ブラウザAPIの呼び出しを持ち込まない。
- Viewはクリックを「サウンドIDが選ばれた」などの値のイベントへ変換する。Presenterは `showResults` や `setLoading` などを呼び、HTMLの構造を知らない。
- Viewのイベント接続はコールバックを使う。Viewから具体的なPresenterクラスをimportしない。
- Modelは常にクラスである必要はない。既存の計算関数は関数として残す。
- 状態の正本は一つにする。組み合わせの行などはModel、検索の処理中フラグ・要求番号などはPresenter、フォーカス・ポップオーバーのアンカーなどはViewが所有する。
- インターフェースは交換・分離が必要な境界にのみ設ける。DIコンテナや汎用イベントバスは追加せず、コンストラクターや関数引数で注入する。

## 目標フォルダ

パスはすべてリポジトリルート基準。既存の `Scripts/` 名は維持する。

| パス | 内容 |
| --- | --- |
| `Scripts/App/` | Bootstrap、Main、初期化と破棄の接続 |
| `Scripts/Model/Search/` | 検索計算、検索条件、検索用データ型 |
| `Scripts/Model/Composition/` | 組み合わせ状態、追加・削除・編集、保存項目のルール |
| `Scripts/Model/Command/` | コマンド生成、設定値と正規化、Minecraftの型・定数 |
| `Scripts/Model/Playback/` | 再生要求の値、候補選択などの純粋なルール |
| `Scripts/Model/Favorites/` | お気に入りの状態・操作 |
| `Scripts/Contracts/Views/` | Presenterが利用するViewインターフェース、画面用データ型 |
| `Scripts/Contracts/Services/` | 検索、保存、再生、コピーなどの入出力契約 |
| `Scripts/Presenter/` | Search、Composition、SavedCompositions、Playback、Settings等の操作調整 |
| `Scripts/View/Search/` | SearchView、検索欄・結果のCSS、検索固有の表示部品 |
| `Scripts/View/Composition/` | 組み合わせ・保存一覧の表示とCSS |
| `Scripts/View/Playback/` | プレイヤー、Canvas波形表示、再生関連CSS |
| `Scripts/View/Settings/` | 設定画面・バージョン選択の表示とCSS |
| `Scripts/View/Layout/` | レイアウト、タブの表示、全体スタイル |
| `Scripts/View/Components/` | Toast、ConfirmDialog、CopyButton、入力欄などの共通部品 |
| `Scripts/Infrastructure/Resources/` | fetch、パス解決、リソース取得・キャッシュ |
| `Scripts/Infrastructure/Search/` | Workerクライアント・エントリー・通信メッセージ型 |
| `Scripts/Infrastructure/Storage/` | localStorageの読み書き、保存キー、保存形式の検証 |
| `Scripts/Infrastructure/Audio/` | HTMLAudioElement・Web Audioの実装、波形データ取得 |
| `Scripts/Infrastructure/Clipboard/` | クリップボードへの書き込み |
| `Scripts/I18n/` | 日本語辞書 |

空フォルダは先に作らず、対応する実装ができた段階で作る。ContractsはModelの値型を参照できるが、View・Presenter・Infrastructureの実装をimportしない。

`.css.ts` は対応するViewと同じフォルダに置く。例：`View/Components/Toast/Toast.ts` と `Toast.css.ts`。共有スタイルはLayoutまたは共通部品に置き、機能間でCSSを相互importしない。起動前の表示崩れを防ぐ `index.html` 内の最小CSSは維持する。

## 現在のファイルの分割・移動方針

| 現在のファイル群 | 方針 |
| --- | --- |
| `SoundSearchBrowser.ts` | DOM・アンカー位置はSearchView、検索進行・ページ切り替え・要求番号はSearchPresenter、検索条件と結果の値はModelに分離 |
| `SoundSearchEngine.ts`、`SearchVectors.ts`、`BuildSearchSounds.ts`、`ResolveSoundEventReferences.ts` | ブラウザ依存の有無を確認し、純粋な検索処理をModel/Searchへ移動 |
| `SearchTypes.ts` | 検索ドメインの型とWorker通信の型を分ける |
| `WorkerSearchService.ts`、`SoundSearchWorker.ts` | Infrastructure/Searchへ。PresenterにはWorkerオブジェクトを公開しない |
| `SoundComposition.ts` | 行データ・制約はModel、操作と保存・再生の調整はPresenter、DOMはView、AudioContext処理はInfrastructureへ分離 |
| `SavedCompositions.ts` | 保存項目のルール、操作調整、一覧描画、永続化に分割 |
| `Singletons/SoundManager.ts` | 設定状態・再生調整・実際の音声API・保存を分離。GetAudioによる音声要素の公開を廃止 |
| `Singletons/ResourceManager.ts` | データ参照と取得の責務を確認し、Appから必要な依存を渡す。グローバルInstance参照を段階的に除去 |
| `MCCommandSound.ts`、`MCRawSound.ts` | 値・計算とリソース取得・URL解決の依存を確認して分離。名前だけでModelへ移動しない |
| `FormatSoundCommand.ts`、`SelectWeightedCandidate.ts` | 純粋関数としてModelへ |
| `SoundSettings.ts` | 入力欄の生成はView、正規化はModel、設定反映・保存はPresenterへ |
| `LocalStorageSchema.ts` | 設定等のドメイン型・正規化と保存形式・キーを分離。既存の保存形式は維持 |
| `Favorites.ts`、`SearchPreferences.ts` | 状態・ルールとlocalStorageアクセスを分離。DOMに関わる復元処理はView/Presenterへ |
| `PreviewPlayer.ts`、各Waveform関連ファイル | DOM・Canvas描画はView、音声データの取得・処理はInfrastructure、再生操作はPresenterへ |
| `Toast.ts`、`ConfirmDialog.ts`、`OutputArea.ts`、`SoundAutocomplete.ts` | 表示部品としてViewへ。業務操作が混ざる箇所はコールバックにする |
| `CopyCommand.ts`、`CopyButton.ts` | コマンド生成・コピーの調整・ボタン表示・Clipboard APIを各責務へ分離 |
| `Apply*Styles.ts`、`ApplyText.ts`、`BrowserTabs.ts`、Popover関連 | Viewへ。タブ選択の保存等はPresenterへ分離 |
| `Constants/` | 定数の用途ごとに所有層へ。保存キーはStorage、Minecraftの値はModel、見た目の値はView |
| `Main.ts`、`Bootstrap.ts` | Appへ。起動時の状態表示はViewに委譲し、起動失敗を捕捉できる構造を維持 |

この表は分割方針であり、機能ごとの実装前に全メソッドと呼び出し元を確認して最終配置を確定する。

## 実装順序

### 1. 基準確認と検索画面の境界設計

- [x] 現在のテスト・ビルドを実行し、既存の不具合と新しい差分を区別できる基準を記録する。
- [x] 検索の入力・結果・エラー・操作と、組み合わせ・再生への接続を一覧化する。
- [x] SearchView、検索サービス、保存・再生との最小限の契約を定義する。
- [x] 検索計算とWorker通信型を分離し、純粋な検索処理を移動する。
- [x] import、WorkerのURL、`tsconfig.worker.json`、テスト・検証ツール内の参照を同時に更新する。

完了条件：既存の画面が動く状態を維持し、検索計算がViewやブラウザAPIに依存しない。

### 2. 検索画面をMVPに分割

- [ ] `SoundSearchBrowser.ts` からSearchViewとSearchPresenterを抽出する。
- [ ] 検索条件・ページ状態の所有者を決め、DOMから値を読み返すことを状態管理の代用にしない。
- [ ] 待機時間、要求番号、再試行、古い結果の無視をPresenterへまとめる。タイマーは必要に応じて注入可能にする。
- [ ] 組み合わせ追加・プレビューはIDや設定値の通知にする。ボタン要素の受け渡しをやめる。
- [ ] Search系CSSと表示部品をViewへ移動する。
- [ ] Appで新しい部品を接続し、旧クラスの置き換えが済んだ処理を削除する。

完了条件：検索・フィルター・ページ切り替え・候補表示が維持され、SearchPresenterを偽のViewとサービスで実行できる。失敗・再試行・応答順の逆転を検証する。

### 3. 再生・設定・リソースアクセスの分離

- [ ] SoundManagerから設定Modelと音声再生サービスを抽出する。
- [ ] Presenter向けに再生・停止・シーク・音量操作と状態通知を値で定義する。
- [ ] PreviewPlayerと波形表示が音声要素や独自DOMイベントに直接依存する接続を置き換える。
- [ ] 音声取得、Blob URL、AudioContext、キャンセルをInfrastructure内に閉じる。
- [ ] 設定UIの入力通知と正規化・保存を分ける。
- [ ] リソース取得・保存を注入し、対象機能のSingleton参照を除去する。

完了条件：再生・停止・シーク・音量・ピッチ・波形が維持され、再生切り替え時の古い要求を無視できる。終了時に音声・URL・購読を解放する。

### 4. 組み合わせと保存一覧をMVPに分割

- [ ] CompositionModelに行データ、最大件数、追加・削除・編集のルールを移す。
- [ ] CompositionViewとPresenterを分離し、段階3の再生サービスを利用する。
- [ ] 同時再生の音声処理をInfrastructureへ移す。
- [ ] SavedCompositionsをModel・View・Presenter・保存サービスに分離する。
- [ ] 保存形式・キー・バージョンの扱いを維持する。破損データを読み込んだ際の書き込み抑止も引き継ぐ。
- [ ] 検索との連携を値のイベントとAppでの接続に統一する。

完了条件：追加・編集・削除・保存・復元・組み合わせ再生が維持される。上限、コピー時の独立性、保存失敗時の状態をDOMなしで検証できる。

### 5. 残りのUI・保存・起動を整理

- [ ] お気に入り、履歴、検索条件の復元、バージョン選択を同じ境界に揃える。
- [ ] 共通表示部品・CSS・辞書を目標フォルダへ移動する。
- [ ] クリップボード、確認ダイアログ、通知の接続を整理する。
- [ ] Mainを生成・接続中心にし、不要になったSingletonと互換用の橋渡しを削除する。
- [ ] 起動表示・失敗表示・再試行、初期表示の白いちらつきを確認する。
- [ ] README・ローカル確認手順の参照を必要な範囲で更新する。

完了条件：機能クラス同士がDOM要素を渡し合わず、Appが依存を接続する。不要な旧ファイル・重複実装が残らない。

### 6. 境界と回帰の最終確認

- [ ] Model・Presenter・ContractsをDOMライブラリなしで型チェックする専用設定を追加し、検証コマンドへ組み込む。依存先にもブラウザAPIが漏れていないことを確認する。
- [ ] 層のimport方向と循環参照を点検する。型チェックだけでは層間の依存ルールをすべて保証しない点に注意する。
- [ ] 既存テスト、データ検証、本番ビルドを通す。
- [ ] previewで主要操作、狭い画面、通信失敗、保存データ復元、Worker・リソースの404がないことを確認する。
- [ ] 計画書の各項目に完了状況と検証結果を記録する。

## 検証方法

各段階は動く単位に分け、関連テストと型チェックを行う。CSS・Worker・エントリーやパスを変えた段階ではビルドも行う。検索データの解釈・取得経路を変えた段階と最終段階ではデータ検証も行う。

```powershell
npm test
npm run typecheck
npm run build
npm run verify:data
```

`build` は型チェックを含むため、同じ差分に対して不要に重複実行しない。起動と停止は [ローカル確認手順](local-development.md) を参照。

追加テストは状態の制約、保存失敗、非同期の競合、操作から表示指示までの振る舞いに集中する。単純なファイル移動やDOMの実装をなぞるだけのテストは増やさない。画面の見た目・CSS・音声の体感はブラウザで確認し、Nodeテストだけで確認済みとしない。

## 作業単位と移行上の注意

- 各段階をさらに機能単位の小さな変更に区切る。すべてを一度に移動しない。
- 移行中のみ旧実装を包む橋渡しを許可する。新しいModel・Presenterへブラウザ依存を持ち込まず、置き換えが済んだ段階で削除する。
- 保存形式の変更を混ぜない。データを削除しないと動かない移行にしない。
- `.css.ts` の移動による生成クラス名の変化に備え、ハードコードしたクラス名やツール内のパス参照も確認する。
- イベント購読、Worker、タイマー、音声の破棄責任を決め、再初期化時の二重登録を防ぐ。
- コミットは自動で行わない。対応後は毎回、ステージ済み・未ステージ・未追跡を確認し、変更全体に合う日本語のコミットメッセージ案を提示する。

次の実装対象は段階2。検索画面を以降の分割の具体例にする。

## 段階1の実施記録（2026-11-09）

変更前は36件のテストと本番ビルドに成功。検索の純粋処理5ファイルをModel/Searchへ、WorkerとクライアントをInfrastructure/Searchへ移動し、通信型をSearchWorkerProtocolに分離した。

SearchServiceは実装・画面側とも接続済み。画面は `search(options)` から結果配列を受け取り、Workerの要求・応答形式を扱わない。SearchViewとSearchPreferencesStore・CompositionActions・SoundPreviewServiceは段階2以降の分割用の型契約であり、既存のDOM処理・保存・再生への接続はまだ置き換えていない。

| 入出力・操作 | 現在の処理と分割時の所有者 |
| --- | --- |
| 文字列・類似検索の基準・タグ・複数候補除外 | Viewが値を通知し、Presenterが条件と120msの待機を管理する |
| 読み込み・検索・再試行 | SearchServiceがデータを取得。Presenterが処理中状態・要求番号を管理する |
| 結果・基準サウンド・ページ移動 | Presenterが50件単位のページを作り、Viewが一覧とページ表示を描画する |
| missing・検索失敗・不正な基準サウンド | Presenterが状態を決め、Viewが辞書から表示文言を選ぶ |
| 入力消去・全条件リセット・類似検索 | Viewから値を通知し、Presenterが条件更新・検索を調整する |
| タグ・候補一覧・波形・フォーカス | 表示処理はView。候補のプレビューだけ値で通知する |
| 検索条件の保存・復元 | SearchPreferencesStoreで検索条件だけを扱う。既存version・tabはアダプター側で保持する |
| 組み合わせ追加・イベント供給 | CompositionActionsへ名前・イベントデータを渡す |
| プレビュー | SoundPreviewServiceへ名前・候補・設定を渡す。組み合わせ停止とコマンド出力を調整し、選択ボタンの表示はView内に残す |
| お気に入り操作 | Viewから名前を通知。確認・保存失敗通知・保存との分離は段階2と5で進める |
| 検索・お気に入りタブへの遷移 | App側で画面の有効化とPresenterへの通知を接続する |

Model・ContractsをDOMなしで検査する `tsconfig.model.json` を前倒しで追加し、通常のtypecheckにも組み込んだ。現時点の契約は純粋なSoundCommand型を既存ファイルから参照する。これは後続のCommandモデル移動時に参照先を変更する。

変更後は36件のテスト、DOMなしの型検査を含む本番ビルドに成功。実データ検証では1,984イベント・4,941音源の検索、タグ、類似度、チェックサムを確認した。ブラウザでの表示・実音の確認は未実施。CSSと画面のDOM構造は変更していない。

## 命名の見直し

検索対象をSearchSound、Minecraftの元定義をSoundEventDefinitionsと呼び分け、参照展開をresolveSoundEventReferences、Worker実装をWorkerSearchServiceへ改名した。接続用の契約は役割ごとのファイルへ分割した。検索条件のreferenceSoundName・excludeMultipleCandidatesは保存境界で従来のbase・excludeMultipleへ変換し、保存済みデータとの互換性を維持する。候補数はcandidateCount、ベクトル行はvectorRow、表示ページの番号と総数はpageIndex・pageCountに統一した。
