# MVP構成への整理計画

## 目的と範囲

Model・View・Presenterを分離し、HTMLを用意しなくても状態管理と操作の流れを検証できる構成にする。既存の表示、機能、保存データ、リソース形式を維持する。段階4まで実装済み（ブラウザでの操作確認は未完了）。段階5はお気に入り・検索条件の保存、バージョン選択、タブ切り替えの分離と、共通UI・CSS・辞書・コピー処理の配置整理、起動・終了処理のAppへの集約まで実装済み。

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

- [x] `SoundSearchBrowser.ts` からSearchViewとSearchPresenterを抽出する。
- [x] 検索条件・ページ状態の所有者を決め、DOMから値を読み返すことを状態管理の代用にしない。
- [x] 待機時間、要求番号、再試行、古い結果の無視をPresenterへまとめる。タイマーは必要に応じて注入可能にする。
- [x] 組み合わせ追加・プレビューはIDや設定値の通知にする。ボタン要素の受け渡しをやめる。
- [x] Search系CSSと表示部品をViewへ移動する。
- [x] Appで新しい部品を接続し、旧クラスの置き換えが済んだ処理を削除する。

完了条件：検索・フィルター・ページ切り替え・候補表示が維持され、SearchPresenterを偽のViewとサービスで実行できる。失敗・再試行・応答順の逆転を検証する。

### 3. 再生・設定・リソースアクセスの分離

- [x] SoundManagerから設定Modelと音声再生サービスを抽出する。
- [x] Presenter向けに再生・停止・シーク・音量操作と状態通知を値で定義する。
- [x] PreviewPlayerと波形表示が音声要素や独自DOMイベントに直接依存する接続を置き換える。
- [x] 単音試聴の音声取得、Blob URL、HTMLAudioElement、キャンセルをInfrastructure内に閉じる。組み合わせのAudioContextは段階4で分離する。
- [x] 設定UIの入力通知と正規化・保存を分ける。
- [x] リソース取得・保存を注入し、対象機能のSingleton参照を除去する。

完了条件：再生・停止・シーク・音量・ピッチ・波形が維持され、再生切り替え時の古い要求を無視できる。終了時に音声・URL・購読を解放する。

### 4. 組み合わせと保存一覧をMVPに分割

- [x] CompositionModelに行データ、最大件数、追加・削除・編集のルールを移す。
- [x] CompositionViewとPresenterを分離し、段階3の再生サービスを利用する。
- [x] 同時再生の音声処理をInfrastructureへ移す。
- [x] SavedCompositionsをModel・View・Presenter・保存サービスに分離する。
- [x] 保存形式・キー・バージョンの扱いを維持する。破損データを読み込んだ際の書き込み抑止も引き継ぐ。
- [x] 検索との連携を値のイベントとAppでの接続に統一する。

完了条件：追加・編集・削除・保存・復元・組み合わせ再生が維持される。上限、コピー時の独立性、保存失敗時の状態をDOMなしで検証できる。

### 5. 残りのUI・保存・起動を整理

- [x] お気に入りのModelと保存サービスを分離し、既存のSearchPresenterへ接続する。
- [x] 検索条件の変換・復元と共有設定の保存を分離する。
- [x] バージョン選択の判断・表示・通信・遷移を分離する。
- [x] タブの保存・復元とDOM・キーボード操作を分離する。
- [x] 履歴の実装状況を確認し、対象があれば同じ境界に揃える。
- [x] 共通表示部品・CSSを対応するViewフォルダへ移動する。
- [x] 辞書を目標フォルダへ移動する。
- [x] クリップボード、確認ダイアログ、通知の接続をAppにまとめる。
- [x] 起動処理をAppへ移し、初期化失敗・終了時の通信中断と部品の解放をまとめる。
- [ ] Mainを生成・接続中心にし、不要になったSingletonと互換用の橋渡しを削除する。
- [ ] 起動表示・失敗表示・再試行、初期表示の白いちらつきを確認する。
- [x] README・ローカル確認手順の参照を必要な範囲で更新する。

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

次の実装対象は段階5の残りのUI・保存・起動の整理。段階2以降のブラウザ確認は接続可能な環境で実施する。

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

## 段階2の実施記録（2026-11-09）

- SoundSearchBrowserをSearchPresenterとHtmlSearchViewに分割。検索条件・120ms待機・要求番号・ページ・保存や他機能との調整をPresenterへ移した。DOM取得、候補一覧、入力補完、波形描画、選択表示はViewが担当する。
- SearchControls.css.ts、SearchResults.css.ts、入力補完、波形表示、スタイル適用処理をView/Searchへ移動。既存の組み合わせ用CSSとの共通表示は維持する。
- App/CreateSearchScreen.tsで検索・保存・再生・確認ダイアログ・タイマーを接続。組み合わせ側の旧コールバックから渡されるボタンはMainとViewの間だけで扱い、Presenterにはサウンド名・候補・設定だけを渡す。組み合わせ側そのものの分割は段階4で行う。
- お気に入りの確認・保存・失敗通知をPresenter経由に変更。保存形式と既存の音声処理は維持する。
- PresenterをDOMなしの型チェック対象へ追加。破棄時はタイマー、Worker、Viewへの操作通知、window/入力欄の購読、波形監視を解除する。
- 44件のテストと、PresenterのDOMなし型検査を含む本番ビルドが成功。新たに応答の順序逆転、入力待機中の古い応答、読み込み・検索失敗と再試行、不正な基準、ページ上限、操作の連携、お気に入り保存失敗、破棄後の応答を検証した。
- 確認用ブラウザからローカルURLへの接続がタイムアウトしたため、表示・実音の手動確認は未完了。

## 段階3の実施記録（2026-11-09）

- CommandSettingsに設定値と正規化を集約し、CommandSettingsPresenterが入力・保存・表示を調整する構成にした。保存形式とキーは維持し、保存失敗時は現在の設定を維持する。
- PlaybackPresenterが候補選択・コマンド出力・再生操作・波形取得を調整し、HtmlPlaybackViewとPreviewWaveformは値を受け取って表示する。音声要素や独自DOMイベントを画面に渡す接続は廃止した。
- BrowserAudioPlaybackがHTMLAudioElement・取得中の通信・Blob URL・再生状態の購読を所有する。音の切り替え・停止・破棄後の古い応答を無視し、終了時には通信・購読・URLを解放する。
- SoundPlaybackResourcesとLocalCommandSettingsStoreをAppで接続した。SoundManager・ResourceManager・SingletonBase・MCCommandSoundを削除し、検索と組み合わせ側も注入した再生サービスと設定Modelを利用する。
- 組み合わせの同時再生エンジンと画面全体の分離は段階4に残す。今回追加した終了処理では、再生購読・音量UI・AudioContextも解放する。
- 49件のテストと、Model・Presenter・ContractsのDOMなし型検査を含む本番ビルドが成功。保存失敗、音源取得と波形取得の応答順逆転、停止・破棄後の応答、音量とピッチ、シークのドラッグ中の表示と確定を検証した。
- 実データ検証は1,984イベント・4,941音源で成功。ブラウザ上の表示と実際の音声再生は未確認。

## 段階4の実施記録：Model分離（2026-11-09）

- 今回は段階4の最初の作業単位として、組み合わせと保存一覧のModelを分離した。段階4全体は未完了。
- Model/Composition/CompositionData.tsに行・保存項目の型と検証を移動した。LocalStorageSchemaからの再公開を残し、保存キー・形式・旧形式の既定値を維持した。
- CompositionModelが行の状態、件数上限、追加・設定変更・削除の候補作成を担当する。SavedCompositionsModelが保存一覧の状態、名前・上書き・削除・上限のルールを担当する。自動命名の表示文言は呼び出し側から渡す。
- 既存画面はModelのコピーを読み、保存成功後にModelを確定する。不正データや読み込み失敗に対する上書き抑止を維持し、過去の上限超過データも削除・編集によって修復できる。
- クラス・公開型・非公開の名前付き関数にdocコメントを追加。ModelはDOMとlocalStorageへ依存しない。
- 53件のテストと、DOMなしのModel型検査を含む本番ビルドに成功。編集候補と確定状態の分離、重複行の個別操作、コピーの独立性、名前・バージョン・件数制限、保存失敗と上書き抑止を検証した。
- 次はCompositionViewとCompositionPresenter、同時再生サービス、続いて保存一覧のView・Presenter・保存サービスを分離する。ブラウザの表示・操作確認は未実施。

## 段階4の実施記録：組み合わせ画面と同時再生の分離（2026-11-09）

- SoundCompositionをCompositionPresenterとView/Composition/HtmlCompositionViewへ分離した。Presenterは行編集・保存・候補選択・画面間操作を調整し、HTML要素を受け取らない。
- CompositionView契約は行番号・設定値・入力の妥当性を通知する。設定の編集中は入力要素を保持し、保存失敗時は確定済みの値を再表示する。試聴ボタンの選択表示はAppでView同士を接続する。
- BrowserCompositionPlaybackがAudioContext、取得・デコード、音源とゲイン、時刻通知を所有する。同一ハッシュは一度だけ取得し、全音源を同じ時刻に予約する。停止・切り替え・破棄後の応答を無効化し、終了時に接続と描画予約を解放する。
- 波形取得はPresenterからWaveformSource経由で行い、CompositionWaveformは取得済みのピークと時刻だけを描画する。遅い応答が新しい行や破棄済みの画面を上書きしない。
- LocalCompositionStoreが既存キーと検証を使って保存する。App/CreateCompositionScreenで各部品を組み立て、画面終了時の破棄をまとめた。
- 検索側はCompositionActionsに接続。旧SoundCompositionと旧CompositionWaveformは削除。保存一覧は移行途中の接続としてCompositionPresenterを参照し、次の作業で自身のView・Presenter・保存サービスを分離する。
- 62件のテストと、DOMなしのModel・Presenter・Contracts型検査を含む本番ビルドが成功。入力要素の維持、保存失敗と上書き抑止、停止・デコード・波形応答の競合、同期再生、音量・ピッチ、購読と音源の解放を検証した。
- 実データ検証は1,984イベント・4,941音源で成功。ブラウザでの表示と実際の音声再生は未確認。

## 段階4の実施記録：保存一覧の分離（2026-11-09）

- SavedCompositionsをSavedCompositionsPresenter、HtmlSavedCompositionsView、LocalSavedCompositionsStoreへ分離し、旧ファイルを削除した。ViewはIDによる操作通知と表示を担当し、保存・名前変更・上書き・復元・削除の判断はPresenterが行う。
- CompositionEditor契約を追加し、Appから組み合わせ画面の値・変更購読・復元操作を接続した。具体的なCompositionPresenterへの依存を取り除き、単一のonChangeを解除可能な購読へ置き換えた。
- App/CreateSavedCompositionsScreenでID生成、確認ダイアログ、名前入力、通知を注入する。終了時はUIと編集画面の購読を解除する。
- 保存成功時だけModelと表示を更新する。保存キー・バージョン・旧形式の既定値・件数制限を維持し、破損データを読み込んだ場合は上書きを抑止する。
- 確認待ちの間に一覧が変わった場合や画面が破棄された場合は、古い確認結果を無効化する。上書き・復元では編集中の内容の変更も確認する。
- 68件のテストと、DOMなしのModel・Presenter・Contracts型検査を含む本番ビルドが成功。保存・名前変更・上書き・削除・復元、コピーの独立性、保存失敗、旧形式、上限、確認のキャンセル・競合、購読解除を検証した。
- 段階4の実装は完了。ブラウザでの表示・実操作の確認は未実施。次は段階5を機能単位で進める。

## 段階5の実施記録：お気に入りの分離（2026-11-09）

- FavoriteSoundsが名前の状態・重複の除去・登録状態を反転する候補の作成を担当し、DOMやlocalStorageへの依存を持たない構成にした。
- FavoriteSoundsStoreを読み書きの契約として独立したファイルへ移し、LocalFavoriteSoundsStoreで既存の保存キー・配列形式を維持した。旧Favoritesは削除した。
- SearchPresenterが保存成功後にModelと表示を更新する。読み込み失敗時はお気に入りだけを利用不可とし、破損データを上書きせず検索を継続する。確認中の同名操作の重複防止と、破棄後の書き込み抑止も維持した。
- 70件のテストと、DOMなしの型検査を含む本番ビルドが成功。名前の独立したコピー、永続化、保存失敗、破損データ、利用できないサウンド名の維持、破棄後の確認応答を検証した。
- ブラウザでの実操作は未確認。段階5は継続中で、次は検索条件の保存・復元やバージョン選択を整理する。

## 段階5の実施記録：検索条件と共有設定の分離（2026-11-09）

- Model/Search/SearchPreferencesへ設定型・正規化・保存フィールドとの変換・索引に応じた復元を移動した。SearchPresenterも純粋な復元関数を使用する。
- BrowserPreferencesStore契約とLocalBrowserPreferencesStoreを追加し、検索条件・バージョン・タブの部分更新を共通化した。StoredSearchPreferencesは検索条件だけを既存のSearchPreferencesStore契約へ公開する。
- Mainで保存サービスを生成し、検索画面・タブ・バージョン選択へ注入する。旧SearchPreferencesを削除した。バージョン選択のDOM・通信・遷移の分離は次の作業に残す。
- 旧フィールド名、保存キー、他機能の設定を保持する部分更新、読み込み失敗時の既定値と警告、書き込み失敗時に操作を継続する既存動作を維持した。
- 71件のテストと、DOMなしの型検査を含む本番ビルドが成功。設定の復元と部分更新、利用できないタグ・基準サウンドの除外、保存失敗、配列の独立性を検証した。
- ブラウザでの実操作は未確認。次はバージョン選択の分離を進める。

## 段階5の実施記録：バージョン選択の分離（2026-11-09）

- ResourceVersionsのModelへ一覧検証と既定バージョンの選択を移した。ResourceVersionPresenterが復元・保存・選択後の遷移を調整し、DOMやURL APIへの依存を持たない構成にした。
- HtmlResourceVersionViewが選択欄と失敗メッセージを表示する。FetchResourceVersionsが一覧取得、BrowserResourceVersionNavigationがURL指定の読取と遷移を担当する。
- App/CreateResourceVersionSelectorで依存を接続し、Mainは選ばれたバージョンを受け取る。旧VersionSelectorは削除した。起動途中でも購読と通信を破棄できるよう、終了処理を初期化待ちより先に登録する。
- URL指定を保存設定より優先し、不明な指定は一覧の先頭へ戻す動作を維持した。遷移時はversion以外のクエリとハッシュを保持する。失敗時は選択欄のエラー表示と起動処理への例外通知を維持する。
- 76件のテストと、DOMなしの型検査を含む本番ビルドが成功。優先順位、一覧検証、失敗後の再試行、重複初期化、破棄後の応答、URL保持、取得のキャンセルを検証した。実データ検証も1,984イベント・4,941音源で成功。
- ブラウザでの表示・実操作は未確認。段階5は継続中。次はタブ・共通UI・起動処理の整理を進める。

## 段階5の実施記録：タブ切り替えの分離（2026-11-09）

- BrowserTabsPresenterが選択タブの復元と保存を担当し、HtmlBrowserTabsViewがクリック・キーボード操作・パネル表示・aria-selectedとtabIndexを担当する構成にした。
- BrowserTab型と判定関数をModel/Navigationへ集約し、保存設定の正規化でも共用する。保存済みのタブIDは変更していない。
- App/CreateBrowserTabsで共有設定を接続し、Mainの終了処理にタブの購読解除を追加した。旧BrowserTabsは削除した。
- 左右キーの循環とHome/Endの移動を維持した。キーボード操作でも既存のクリック通知を発火し、検索や保存一覧の更新を継続する。復元時はフォーカスを動かさない。
- 79件のテストと、DOMなしの型検査を含む本番ビルドが成功。実際のViewとPresenterをテスト用の要素で接続し、選択復元・設定の保持・パネル表示・キー操作・クリック通知・破棄後の購読解除を検証した。
- ブラウザでの実操作は未確認。段階5は継続中で、次は共通UI・CSS・起動処理の整理を進める。

## 段階5の実施記録：共通UIとCSSの配置整理（2026-11-09）

- トースト・確認ダイアログ・コピー・コマンド出力・音量操作をView/Componentsへ移し、各部品のCSSを同じフォルダに配置した。入力欄の共有CSS、ポップオーバー位置調整、追加項目の表示補助も共通部品へ移した。
- Layout・Playback・SettingsのCSSとスタイル適用処理を対応するView配下へ移動し、Compositions.css.tsをView/Compositionへ移した。合計20ファイルの移動に合わせ、静的importと起動側の参照を更新した。
- クラスや公開関数、内部の名前付き処理に役割を説明するdocコメントを補った。移動前後の比較で、importとコメント以外の処理・スタイル定義が変わっていないことを確認した。
- 79件の既存テストと、DOMなしの型検査を含む本番ビルドが成功。CSSの生成もビルドで確認した。ファイル移動だけをなぞる新規テストは追加していない。
- ブラウザでの見た目の確認は未実施。辞書の移動、クリップボード等の接続、起動処理の整理は引き続き段階5で進める。

## 段階5の実施記録：辞書と文言適用処理の配置整理（2026-11-09）

- 日本語辞書をScripts/I18n/Text.tsへ、HTMLの文言と属性の適用をScripts/View/ApplyText.tsへ移した。各View・App・検証ツールのimportを更新した。
- 辞書の内容とアルファベット順のキー配置は維持した。移動前後を改行コードを揃えて比較し、内容に差分がないことを確認した。
- 文言編集手順とサウンド検索関連ドキュメントの参照先を更新した。文言適用の内部判定関数にdocコメントを補った。
- 79件のテストと、DOMなしの型検査を含む本番ビルドが成功。辞書キーの順序とHTMLのキー照合も既存テストで検証した。ブラウザでの表示確認は未実施。
- 段階5は継続中。次はクリップボードの接続と起動処理の整理を進める。

## 段階5の実施記録：コピー処理の接続整理（2026-11-09）

- Clipboard契約とBrowserClipboardを追加し、ブラウザAPIへの書き込みをInfrastructureへ分離した。CopyCommandPresenterが書き込み完了を待ち、成功・失敗を値で通知する。
- App/CreateCommandCopierがコピー処理と既存の日本語トーストを接続する。Mainからプレビュー・組み合わせ・保存一覧へ同じコピー操作を渡す。
- CopyButtonとOutputAreaは注入したCopyText操作を呼ぶ。具体的なClipboard APIやトーストをimportしない。旧CopyCommandは削除した。
- 82件のテストと、DOMなしの型検査を含む本番ビルドが成功。複数行の文字列をそのまま渡すこと、書き込み完了後の通知、拒否後の再実行、クリック時点の最新テキストを検証した。
- ブラウザでの実コピーは未確認。段階5は継続中。次は起動・終了処理の整理と残った依存関係の確認を進める。

## 段階5の実施記録：起動・終了処理の整理（2026-11-09）

- BootstrapとMainをScripts/Appへ移し、index.htmlのエントリーを更新した。設定ポップオーバーの副作用による初期化を、解放操作を返すInitializeSettingsPopoversへ置き換えた。
- DisposalScopeで作成済みの部品を逆順に解放する。起動途中の失敗、ページ終了、開発時のモジュール破棄でも解放し、一つの解放処理が失敗しても残りを続行する。各画面の組み立て途中で失敗した場合も、登録済みの部品を解放する。
- NetworkFileLoaderを削除し、Infrastructure/Resources/FetchTextResourceへ通信を集約した。起動中の通信をAbortSignalで中断し、終了後に初期化が進むことを防ぐ。
- 起動前の最小CSS、失敗表示と再読み込みボタンは維持した。クラス・内部処理に日本語のdocコメントを追加した。
- 86件のテスト、本番ビルド、実データ検証を実施。ブラウザでの起動表示・白いちらつき・実操作の確認は未実施。
- 段階5は継続中。残った依存関係・旧実装・履歴の確認と、ブラウザでの検証を進める。

## 段階5の実施記録：純粋関数と保存処理の配置整理（2026-11-09）

- FormatSoundCommandとMinecraftのセレクター・音源カテゴリ定数をModel/Commandへ、SelectWeightedCandidateをModel/Playbackへ移した。
- LocalStorage・LocalStorageSchema・LocalStorageKeyをInfrastructure/Storageへ集約した。保存キー、既定値、正規化規則、JSON形式は維持した。
- LocalStorageSchemaからModelの型・関数を再公開する互換経路と未使用のFavoriteSoundIds型を削除した。利用側とテストはModelを直接参照する。
- 全importとテストの参照先を更新し、公開型のdocコメントを補った。86件のテストとDOMなしの型検査を含む本番ビルドで確認した。ブラウザでの実操作は未確認。
- 段階5は継続中。リソース関連の旧クラス、残った定数、履歴の実装状況、ブラウザでの回帰確認は引き続き整理する。

## 段階5の実施記録：再生リソースの旧クラス整理（2026-11-09）

- SoundPlaybackResourcesが取得済みJSONを受け取り、生成時に検証とイベント参照の展開を完了する形にした。Mainから個別のParseResource呼び出しを取り除いた。通信の中断と起動失敗の扱いは維持した。
- MCPlaysoundCommandParamResource・MCSoundHashResource・MCRawSound・ResourceBaseを削除した。Presenterは引き続きPlaybackResources契約だけを利用する。
- サウンド名からハッシュへの対応、静的音声URL、候補の音量・ピッチ・重みと既定値を維持した。不明なイベントは明示的なエラーとし、ハッシュ欠落は再生前に検出する。
- 既存テストを新しい入力形式へ更新し、イベント参照による設定の合成、候補の独立性、空イベント、不正データと循環参照の検証を追加した。
- ブラウザでの実操作は未確認。残ったリソース共通処理・定数の配置、履歴の実装状況、最終的な依存関係と回帰の確認は継続する。
- 88件のテスト、DOMなしの型検査を含む本番ビルド、実データ検証（1,984イベント・4,941音源）が成功した。

## 段階5の実施記録：共通リソースと音量定数の配置整理（2026-11-09）

- ResourceDataをInfrastructure/Resources/ParseResourceDataへ、ResourcePathProviderを同フォルダへ移動した。外部JSONの形式検証と配信先の解決をInfrastructureにまとめ、内部の判定関数にもdocコメントを補った。
- SettingDefineをModel/Playback/MasterVolumeSettingsへ移し、音量設定を表す名前に変更した。既定値・上下限・検証規則・リソースURLは変更していない。
- App・View・Infrastructure・テスト・実データ検証ツールの参照先を更新した。READMEに現在のフォルダ構成を追加し、ローカル確認手順の古いテスト件数と起動ファイルの説明を更新した。
- 現在のScripts・index.html・テストには再生履歴の実装やUI、保存キーを確認できなかった。今回の移行対象はなく、新しい履歴機能は追加しない。
- ブラウザでの表示・操作確認と、層間依存・循環参照の最終点検は未完了。
- 88件のテスト、DOMなしの型検査を含む本番ビルド、実データ検証（1,984イベント・4,941音源）が成功した。移動した3ファイルはimport・名称・コメント以外の処理に差分がないことも確認した。
