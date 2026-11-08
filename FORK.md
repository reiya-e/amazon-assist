# FORK.md

このリポジトリの自分用フォークに関する、指示と引き継ぎ。自分のフォーク（公開）の `personal` ブランチにコミットする。上流へは PR を出さないので、上流には届かない。公開されるため、実際の注文番号・カード番号・金額などは書かない。

## フォークの構成

- `origin`: https://github.com/reiya-e/amazon-assist （自分のフォーク。公開）
- `upstream`: https://github.com/vessel-ltd/amazon-assist （元のリポジトリ）
- `main`: 上流のコピーとして保つ。直接コミットしない。
- `personal`: 自分用の作業ブランチ。機能追加はここで行う。
- 上流へ PR は出さない。上流の README に「月別の領収書・購入明細書をまとめてPDF保存する小さなツールとして維持します。」とあり、成果物の PR は受け付けない方針のため。
- 上流の更新は `git fetch upstream` → `main` を更新 → `personal` にマージで取り込む。
- ライセンスは MIT（Copyright (c) 2026 Vessel Ltd.）。`LICENSE` と著作権表示は残す。
- 配置は AI-agent リポジトリの `workspace/amazon-assist`（Git管理外）。親リポジトリの AGENTS.md の規約はそのまま適用される。

## 運用ルール

- このフォークには `AGENTS.md` / `CLAUDE.md` を作らない。AI エージェント向けの指示は、この `FORK.md` が担う（親リポジトリのブリッジ規約の例外）。
- コミットはこのフォーク自身の Git（`workspace/amazon-assist/.git`）で、`personal` ブランチに作業の区切りごとに行う。`main` には直接コミットしない。push 先は `origin`（自分のフォーク）の `personal`。親リポジトリ（AI-agent）の Git では管理しない。
- フォークは公開リポジトリ。実際の領収書・注文履歴 HTML・カード情報は絶対にコミットしない。置き場所は `tmp/fixtures/`（`.gitignore` 済み）。コミット前に `git status` と差分で確認する。
- 方針: 領収書のPDF化は行わず、適格請求書PDFを `fetch` で取得し、`showDirectoryPicker` で選んだフォルダー配下へ支払い方法別に書き込む（`debugger` 権限は使わない）。詳細は「プラン」。

## 目的

月別の領収書をまとめて PDF 保存する既存機能に、支払い方法別に分ける機能を自分用に追加する。

## 次回セッションへの引き継ぎ


状況: 2026-11-08、v1.2.0 として実装済み（`personal` ブランチ、コミット 8f7d174・793ab23、origin へ push 済み）。**実 Chrome で動作確認済み**（下記「実機確認の結果」）。

- 追加: `extension/invoices.js`（`saveInvoices`）、`core.js` の `invoicePopoverURL` / `parseInvoicePopover` / `extractPayment` / `paymentFolder` / `invoiceFileName` / `isPDF`、`app.js` の「適格請求書をフォルダーに保存」ボタン、`tests/invoices.test.mjs`。
- 流れ: フォルダー選択 → 注文一覧 → 注文ごとに 領収書ページを取得用タブで読み（支払い方法）→ popover と請求書PDFを拡張ページの `fetch`（host_permissions）で取得 → `カード下4桁NNNN/`・`混在/`・`不明/` へ `YYYY-MM-DD_注文番号.pdf` で書き込む。同名は上書き。請求書なしは一覧報告、取得失敗は全体中止。
- 自動テストは JS 35件と Python 6件が通る。

### 実機確認の結果（2026-11-08）

- 拡張ページからの `fetch`（host_permissions）で、popover と請求書PDFを取得できた。取得用タブ経由への切り替えは不要。
- 2026年10月分で、選んだフォルダーに32件のPDFが保存された（カード別2フォルダーと `混在/`。`不明/` は作られなかった）。全ファイルが `%PDF-` で始まり、サイズは約44〜79KB。ファイル名は `YYYY-MM-DD_注文番号.pdf`。
- 請求書がない注文（先に調べた JCB 払いの2件）は保存されず、想定どおり。ポイント併用の注文は `混在/` に入った。
- ユーザーが目視で確認: PDFの中身は注文と合っている。完了時の「請求書なし」の一覧も正しい。
- 所要時間: 放置して気づいたら終わっていて、待ち時間は気にならなかった。注文一覧を年初まで遡るのは想定どおりの挙動で、実害は小さい。そのため下記「次のタスク」（打ち切り設定）の優先度は低い（やる場合は任意）。保存先はブラウザのダウンロードではなく、選んだフォルダー。
- 現時点で、機能面の未解決の問題はない。

### 次のタスク: 注文一覧の打ち切りを設定で切り替えられるようにする（ユーザー了承済み、実装は新しいセッションで）

背景: 実機で「適格請求書をフォルダーに保存」を10月分で実行したところ、取得用タブが注文履歴を年初（2026年1月）まで遡った。既存の `collectOrders`（`core.js`）が、他の拡張による全件展開に備えて「対象月に関係なく最後のページまで追う」作りのため（想定どおりの既存挙動。保存先はダウンロードではなく選んだフォルダーで、一覧取得が終わるまで何も書かれない）。

方針:
- 設定（チェックボックス）で、対象月より古いページに達したらページ送りを打ち切る挙動を切り替えられるようにする。月別PDF出力にも効く共通の設定にする。既定値は実装時に決める（高速化なら ON、取りこぼし回避なら OFF）。
- 打ち切り条件: そのページの注文がすべて対象月より古いとき。一覧は新しい順なので、境目のページは続けて読み、次の全部古いページで止まる。対象月と新しい月が混ざるページでは止めない。
- `parseOrders` が「全注文が対象月より古いか」を返し、`collectOrders` は引数（オプション）で打ち切りを有効にする。既存テストの呼び出しは変えない。
- 設定の保存は `localStorage`（try/catch で失敗時は既定値）。`storage` 権限は足さない。
- テスト: 打ち切り ON で後続ページを読まない／OFF で最後まで読む／境目ページの扱い／他拡張が順序を崩した一覧で取りこぼさないこと。README・CHANGELOG・`app.html` の説明も更新する。
- 上流へ PR は出さない（ユーザー指示）。この変更だけ上流に出せる形にしておく案は出たが、出さない前提で `personal` にのみコミットする。

次回セッションの最初にやること:

1. 出店者発行注文の請求書、請求書なしの理由、ギフト券・コンビニ払いの文言を確認する（「未確定事項」）。
2. （任意・低優先）上の「次のタスク」（注文一覧の打ち切り設定）を実装する。
3. ユーザーが解決を確認したら、落とし穴を `docs/troubleshooting/`（親リポジトリ）に記録する。

この PC の環境メモ: `python3` は Microsoft Store のスタブで動かない（`npm test` の Python 部分と `npm run test:package` が失敗する。変更前から同じ）。Python は `python`（3.8）を使い、`PYTHONUTF8=1` を付ける。Python 3.8.0 は長い日本語行を含むスクリプトを標準入力・ファイルから読むと「Non-UTF-8 code」で失敗することがあるので、日本語を含む編集は Node で行う。README などは CRLF。
Claude in Chrome は使える（`mcp__claude-in-chrome__*`）が、ユーザーが開いているタブは見えず、新しいタブグループで作業する。ログインは共有される。

## 調査結果

調査日: 2026-11-08。対象: `extension/`、`tests/`、`README.md`、`CONTRIBUTING.md`、`docs/RELEASING.md`、実際の Amazon 注文履歴（「実機調査」参照）。以下「現状の処理の流れ」「支払い方法まわり」はコード読解の結果で、実物の文言は「実機調査」が優先。

### 現状の処理の流れ

1. [app.js](extension/app.js) が `collectOrders`（[core.js](extension/core.js)）で対象月の注文を集める。
2. 注文ごとに `/gp/css/summary/print.html?orderID=...` を取得用タブで開き、[rendered.js](extension/rendered.js) の `captureRendered` が描画後の DOM を取り、`parseReceipt` が `{id, html, styles}` に整形する。
3. `reportHTML(receipts, month)` が全注文を1つの HTML にまとめ、iframe に流し込んで `window.print()` を呼ぶ。
4. 保存は Chrome の印刷画面の「PDFに保存」。ファイル名は `document.title`（`Amazon領収書_YYYY-MM`）から決まる。拡張自身はファイルを書かない。

### 支払い方法まわり

- 領収書ページの支払い情報は `[data-component="viewPaymentPlanSummaryWidget"]`（非同期で描画される）にある。`captureRendered` はこの中身が空の間は待つので、取得時点では描画済み。カード画像は `[data-testid="payment-instrument-art"]`。
- Amazonフレッシュの注文詳細（`#ufpo-od-main-section`）では `.pmts-payment-instrument-billing-address` に「カード名 下4桁 NNNN」の形で出る（テストの模擬データより。実物は未確認）。
- 現状は支払い方法を構造化して取り出していない。診断ログも支払い情報は意図的に含めない（[diagnostics.js](extension/diagnostics.js)）。
- リポジトリに実ページのフィクスチャはない（`tmp/` は Git 管理外で現在は存在しない）。カード名・末尾4桁の実際の文言とマークアップは、実注文のページを保存して確認する必要がある。ギフト券・ポイント・コンビニ払いなどの表示も同様に未確認。

### 保存方式（案 A は取り下げ）

拡張は自分でフォルダーを作れないため、印刷ダイアログ方式ではフォルダー分けができない。当初は `debugger` + `Page.printToPDF` で領収書をPDF化する案 A を検討したが、必要なものが領収書ではなく適格請求書PDF（Amazon が生成済み）だと分かったため取り下げた。請求書PDFは `fetch` でバイト列を得て、File System Access API（`showDirectoryPicker`）で選んだフォルダー直下にサブフォルダーを作って書き込む。PDFを描画しないので `debugger` 権限は不要。

### 分類の仕様（FORK.md 確認済み）

- 分け方: フォルダ分け
- 粒度: カードごと（末尾4桁）
- 複数の支払い方法にまたがる注文: 「混在」フォルダー
- 取得できなかった注文: 「不明」フォルダー（別ディレクトリ）

### 影響範囲

- `core.js` に `parseInvoicePopover` / `extractPayment` / `groupInvoices` を足す（既存の `parseReceipt` / `reportHTML` は変えない）。`core.js` は [scripts/build.mjs](scripts/build.mjs) で `reader-content.js` にバンドルされるため、変更後は `npm run build` で生成ファイルも更新する（CI が差分を検出する）。
- テストは `tests/core.test.mjs` / `tests/rendered.test.mjs` に追加する。`node_modules/` が未インストールなので、最初に `npm ci` が必要。
- 診断ログには末尾4桁を含めない（グループ数など件数だけ）。[PRIVACY.md](PRIVACY.md) と README の説明、`manifest.json` の権限、バージョン、CHANGELOG を更新する。
- 取得に失敗した注文は黙って省かない、という既存の方針（全体中止）は維持する。支払い方法だけ取れない場合は中止せず「不明」に振り分ける。

### 実機調査（2026-11-08、Claude in Chrome、読み取りのみ）

対象: 注文履歴ページ（過去3か月・71件）の先頭10件。

- 「領収書等」ポップアップの中身は、クリック時に `GET /your-orders/invoice/popover?orderId=<注文番号>` で読み込まれる。ページ内から `fetch`（credentials 付き）でも 200 で取れ、HTML 内の `<a>` に「印刷可能な注文概要」（`/gp/css/summary/print.html?...`）、「明細書／適格請求書」（`/documents/download/<uuid>/invoice.pdf`）、「請求書のリクエスト」（`/gp/help/contact/contact.html`）が並ぶ。
- 適格請求書PDFは `/documents/download/<uuid>/invoice.pdf` を `fetch` すれば、リダイレクトなし・200・先頭 `%PDF-` で直接返る（約49KB）。取得用タブもダウンロード操作も不要で、拡張から `fetch` してバイト列を得られる見込み。`<uuid>` は注文番号と別物なので、必ずポップアップHTMLから引く。
- 10件中、「明細書／適格請求書」リンクがあったのは8件。リンクがない注文が2件あった（どちらも JCB 払い。理由は未確認）。リンクなしは「請求書なし」として扱い、全体を中止しない方針が妥当。
- 領収書ページ `GET /gp/css/summary/print.html?orderID=<注文番号>` の HTML には、支払いウィジェット `[data-component="viewPaymentPlanSummaryWidget"]` がサーバー描画済みで含まれる（`fetch` した生HTMLで取れる。描画待ちは不要）。
- 支払い方法の各行は `[data-testid="payment-instrument-message"]` のテキスト。実際の文言は「Amazon Prime Mastercard •••• 1234」「JCB •••• 5678」の形式（数字は例）（カード名 + 空白 + `••••` + 下4桁）と「Amazonポイント」。ポイント併用の注文では行が2つ（「Amazonポイント」とカード）になり、`[data-testid^="paragraph-fragment"]` に「￥1,000 (ポイント相当) 適用済み」が出る。したがって、行が複数なら「混在」、カード行が1つなら下4桁でフォルダー分け、取れなければ「不明」で足りる。
- 未確認: ギフト券・コンビニ払い・代引きなどの文言、出店者発行（マーケットプレイス）注文の請求書の経路が Amazon 販売分と同じか、リンクなしの理由、複数ページにまたがる月の注文一覧の取り方。

## プラン

作業は `personal` ブランチで行う。方針: 適格請求書PDFを `fetch` で取得し、`showDirectoryPicker` で選んだフォルダー配下の `カード下4桁NNNN/`・`混在/`・`不明/` に、注文番号入りのファイル名で書き込む。既存の「月別領収書を1つのPDFにまとめる」機能は残す（新機能は別ボタン・別経路）。

1. 準備: `npm ci` → `npm run build` → `npm test` で現状のベースラインを確認する。
2. 試作（成否判定）: 拡張ページ（`app.js`）から次が通るかを最小構成で確認する。
   - `/your-orders/invoice/popover?orderId=...` と `/documents/download/<uuid>/invoice.pdf` の `fetch` が、拡張の権限・オリジン（`host_permissions`）で通るか。通らなければ、既存の領収書取得と同じくコンテンツスクリプト経由にする。
   - `showDirectoryPicker` でサブフォルダーを作り、PDFのバイト列を書き込めるか。
3. 注文一覧の取得: 既存の `collectOrders`（`core.js`）で得られる注文番号を使う。請求書は注文ごとに popover を引く。
4. 請求書リンクの抽出: `core.js` に `parseInvoicePopover(html)` を追加する。戻り値は `{ invoiceUrl: string | null }`。リンクなしは `null`（全体は中止しない）。「請求書のリクエスト」リンクは無視する。
5. 支払い抽出: `core.js` に `extractPayment(root)` を追加する。`[data-testid="payment-instrument-message"]` の行を集め、「Amazonポイント」などカード以外の行が混じる、またはカード行が複数なら `mixed`、カード行が1つなら `{kind:'card', key:'下4桁'}`（`••••` の後ろの4桁を取る）、取れなければ `unknown`。実物の文言に合わせた模擬データでテストを書く。
6. グループ化: `groupInvoices(items)` を追加する。フォルダー名は `カード下4桁NNNN` / `混在` / `不明`。ファイル名は `<注文番号>.pdf`（注文日を前置するかは実装時に決める）。使えない文字を除去する関数も用意する。
7. 出力: フォルダー選択 → 注文ごとに請求書PDFを取得して書き込む。リンクなし（請求書なし）の注文は書き込まず、完了時に件数と注文番号を一覧表示する。ネットワークエラーや不正なレスポンス（`%PDF-` で始まらない）は、黙って省かず全体を中止する既存方針に合わせる。支払い方法だけ取れない場合は中止せず「不明」に振り分ける。
8. 画面: `app.html` に「請求書をフォルダーに保存」を追加し、進捗と結果（保存数・請求書なし・不明の件数）を表示する。
9. 周辺更新: 診断ログは件数のみ（末尾4桁を含めない）。PRIVACY.md、README、`manifest.json`（権限・バージョン）、CHANGELOG を更新する。`core.js` を変更したら `npm run build` で生成物も更新する。
10. 検証: `npm test`、`npm run package` / `npm run test:package`、最後に実 Chrome で自分の実注文を通して確認する（自動テストは実PDF保存を保証しない）。
11. コミット: 上流の `main` には触れず `personal` にコミットし、`origin` の `personal` へ push する。FORK.md と実データはコミットしない。

### 未確定事項

- 出店者発行（マーケットプレイス）注文の請求書の経路が、Amazon販売分と同じか。
- 請求書リンクがない注文（JCB 払いの2件など）の理由。電子書籍・キャンセルも含む。
- ギフト券・コンビニ払い・代引きなどの支払い方法の文言。
- 月をまたぐ・複数ページの注文一覧の取り方（既存の `collectOrders` で足りるか）。
- 同名ファイルが既にあるときの扱い（上書きか、スキップか）。
- ファイル名の最終形（例: `カード下4桁1234/2026-10-25_250-0000000-0000000.pdf`）。
