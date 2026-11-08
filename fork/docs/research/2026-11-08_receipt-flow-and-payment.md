# 既存の領収書処理と支払い方法の調査（コード読解）

- 最終更新日: 2026-11-08
- 調査範囲: `extension/`、`tests/`、`README.md`、`CONTRIBUTING.md`、`docs/RELEASING.md`。実際の Amazon 注文履歴は [実機調査](2026-11-08_invoice-popover-live.md) で調べた。
- 根拠: コード読解のみ。ここに書いた支払い方法の文言は模擬データ（テスト）から読んだもので、実物の文言は実機調査が優先する。
- 注意: 調査は実装前（v1.2.0 より前）の時点のもの。現行の挙動は [features](../features/invoice-export.md) を見る。

## 実装前の処理の流れ（既存の月別PDF出力）

1. [app.js](../../../extension/app.js) が `collectOrders`（[core.js](../../../extension/core.js)）で対象月の注文を集める。
2. 注文ごとに `/gp/css/summary/print.html?orderID=...` を取得用タブで開き、[rendered.js](../../../extension/rendered.js) の `captureRendered` が描画後の DOM を取り、`parseReceipt` が `{id, html, styles}` に整形する。
3. `reportHTML(receipts, month)` が全注文を1つの HTML にまとめ、iframe に流し込んで `window.print()` を呼ぶ。
4. 保存は Chrome の印刷画面の「PDFに保存」。ファイル名は `document.title`（`Amazon領収書_YYYY-MM`）から決まる。拡張自身はファイルを書かない。

## 支払い方法まわり（実装前）

- 領収書ページの支払い情報は `[data-component="viewPaymentPlanSummaryWidget"]`（非同期で描画される）にある。`captureRendered` はこの中身が空の間は待つので、取得時点では描画済み。カード画像は `[data-testid="payment-instrument-art"]`。
- Amazonフレッシュの注文詳細（`#ufpo-od-main-section`）では `.pmts-payment-instrument-billing-address` に「カード名 下4桁 NNNN」の形で出る（テストの模擬データより。実物は未確認）。
- 実装前は支払い方法を構造化して取り出していなかった。診断ログも支払い情報は意図的に含めない（[diagnostics.js](../../../extension/diagnostics.js)）。
- リポジトリに実ページのフィクスチャはない（`tmp/` は Git 管理外）。カード名・末尾4桁の実際の文言とマークアップは、実注文のページを保存して確認する必要があった（その後、実機調査で確認した）。ギフト券・ポイント・コンビニ払いなどの表示は、ポイントを除いて未確認。

## 保存方式の検討（案 A は取り下げ）

拡張は自分でフォルダーを作れないため、印刷ダイアログ方式ではフォルダー分けができない。当初は `debugger` + `Page.printToPDF` で領収書をPDF化する案 A を検討したが、必要なものが領収書ではなく適格請求書PDF（Amazon が生成済み）だと分かったため取り下げた。請求書PDFは `fetch` でバイト列を得て、File System Access API（`showDirectoryPicker`）で選んだフォルダー直下にサブフォルダーを作って書き込む。PDFを描画しないので `debugger` 権限は不要。

## 未確認事項

- ギフト券・コンビニ払い・代引きなど、ポイント以外の支払い方法の文言。単独の非カード行は現状 `不明/` に入る（[features](../features/invoice-export.md) 参照）。
- 実ページの支払い欄のマークアップが、将来の Amazon 側の変更でどう変わるか（変わると `不明/` に落ちる）。
