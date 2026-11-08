# 適格請求書をフォルダーに保存

- 状態: v1.2.0 で実装済み（`personal` ブランチ）。実 Chrome で動作確認済み（[実機確認](../research/2026-11-08_invoice-popover-live.md)）。
- 既存の「月別領収書を1つのPDFにまとめる」機能は残してある。この機能は別ボタン・別経路。

## 概要

対象月の注文ごとに、Amazon が発行した適格請求書PDFを取得し、`showDirectoryPicker` で選んだフォルダー配下へ支払い方法別のサブフォルダーに書き込む。領収書のPDF化は行わない（`debugger` 権限は使わない）。

## 流れ

1. 「適格請求書をフォルダーに保存」ボタンで保存先フォルダーを選ぶ（`showDirectoryPicker`、読み書き）。
2. 注文一覧を `collectOrders` で集める。
3. 注文ごとに、領収書ページを取得用タブで読んで支払い方法を取り出し、popover と請求書PDFを拡張ページの `fetch`（host_permissions）で取得する。
4. 支払い方法に応じたサブフォルダーへ書き込む。

## 分類（フォルダー分け）

| 支払い | フォルダー |
|---|---|
| カード行が1つだけで、非カード行がない | `カード下4桁NNNN/` |
| 支払い行が複数（カード複数、またはカードと「Amazonポイント」などの併用） | `混在/` |
| 支払い方法を取れない（支払い行がない、または非カード行が単独） | `不明/` |

- カード行の判定: 行末が `••••` / `**` / `下4桁` / `末尾` の後ろに4桁の数字。「カード名 •••• NNNN」（通常の注文）と「カード名 下4桁 NNNN」（Amazonフレッシュ）に対応。
- 粒度はカードごと（末尾4桁）。「不明」は別ディレクトリ。支払い方法だけ取れない場合は中止せず `不明/` に振り分ける。

## ファイル名と上書き

- ファイル名: `YYYY-MM-DD_注文番号.pdf`（例: `2026-10-25_250-0000000-0000000.pdf`。日付は一覧から読んだ注文日、`YYYY-MM` は対象月）。
- 同名のファイルが既にあれば上書きする（スキップしない）。書き込みに失敗したときは書き込みを中断して全体を中止する。

## 請求書なし・失敗時

- 請求書なし: popover に「明細書／適格請求書」リンクがない注文は、書き込まずに「請求書なし」として数える。全体は中止せず、完了時に件数と注文番号の一覧を表示する。「請求書のリクエスト」リンクは無視する。
- 取得失敗: ネットワークエラーや、`%PDF-` で始まらないレスポンスは、黙って省かず全体を中止する（取得漏れを防ぐ既存方針）。

## 診断ログ・プライバシー

- 診断ログには件数・注文番号だけを残し、カード末尾4桁は含めない。イベント: `invoice_saved` / `invoice_missing` / `invoices_saved`、エラーコード `invoice_invalid`。
- [PRIVACY.md](../../../PRIVACY.md) と README に説明がある。`manifest.json` の権限・バージョン、CHANGELOG も更新済み。

## 実装の場所

- `extension/invoices.js`（`saveInvoices`）
- `extension/core.js`: `invoicePopoverURL` / `parseInvoicePopover` / `extractPayment` / `paymentFolder` / `invoiceFileName` / `isPDF`
- `extension/app.js`: ボタンと進捗・結果表示
- `tests/invoices.test.mjs`

## 開発メモ

- `core.js` は [scripts/build.mjs](../../../scripts/build.mjs) で `reader-content.js` にバンドルされる。変更後は `npm run build` で生成物も更新する（CI が差分を検出する）。最初に `npm ci` が必要。
- 検証: `npm test`、`npm run package` / `npm run test:package`。自動テストは実PDF保存を保証しないので、実 Chrome で自分の実注文を通して確認する。
- 自動テストは JS 35件と Python 6件が通る（`python3` はこの PC では動かない。FORK.md の環境メモを見る）。
