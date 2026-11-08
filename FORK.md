# FORK.md

このリポジトリの自分用フォークに関する、指示と引き継ぎ。自分のフォーク（公開）の `personal` ブランチにコミットする。公開されるため、実際の注文番号・カード番号・金額などは書かない。

## フォークの構成

- `origin`: https://github.com/reiya-e/amazon-assist （自分のフォーク。公開）
- `upstream`: https://github.com/vessel-ltd/amazon-assist （元のリポジトリ）
- `main`: 上流のコピーとして保つ。直接コミットしない。
- `personal`: 自分用の作業ブランチ。機能追加はここで行う。
- 上流へ PR は出さない（自分用の仕様のため）。
- 上流の更新は `git fetch upstream` → `main` を更新 → `personal` にマージで取り込む。
- ライセンスは MIT（Copyright (c) 2026 Vessel Ltd.）。`LICENSE` と著作権表示は残す。
- 配置は AI-agent リポジトリの `workspace/amazon-assist`（Git管理外）。親リポジトリの AGENTS.md の規約はそのまま適用される。

## 運用ルール

- このフォークには `AGENTS.md` / `CLAUDE.md` を作らない。AI エージェント向けの指示は、この `FORK.md` が担う（親リポジトリのブリッジ規約の例外）。
- コミットはこのフォーク自身の Git（`workspace/amazon-assist/.git`）で、`personal` ブランチに作業の区切りごとに行う。`main` には直接コミットしない。push 先は `origin`（自分のフォーク）の `personal`。親リポジトリ（AI-agent）の Git では管理しない。親の AGENTS.md にある「`origin/master` へ push」は、このフォークには適用しない（この FORK.md を優先する）。
- `FORK.md` と `fork/` はコミットする（`personal` ブランチ。公開されるので実データは書かない）。実際の領収書・注文履歴 HTML・カード情報・請求書PDFなどの実データは絶対にコミットしない。置き場所は `tmp/fixtures/`（`.gitignore` 済み）。コミット前に `git status` と差分で確認する。
- 方針: 領収書のPDF化は行わず、適格請求書PDFを `fetch` で取得し、`showDirectoryPicker` で選んだフォルダー配下へ支払い方法別に書き込む（`debugger` 権限は使わない）。仕様は [fork/docs/features/invoice-export.md](fork/docs/features/invoice-export.md)。

## 目的

月別の領収書をまとめて PDF 保存する既存機能に、支払い方法別に分ける機能を自分用に追加する。

## 次回セッションへの引き継ぎ

状況: 2026-11-08、適格請求書の保存機能が v1.2.0 として実装済み（`personal` ブランチ、コミット 8f7d174・793ab23、origin へ push 済み）。**実 Chrome で動作確認済み**（[実機確認](fork/docs/research/2026-11-08_invoice-popover-live.md)）。現時点で、機能面の未解決の問題はない。

- 仕様: [fork/docs/features/invoice-export.md](fork/docs/features/invoice-export.md)
- 次の実装案: [fork/ideas.md](fork/ideas.md)（注文一覧の打ち切り設定は優先度が低く、やる場合は任意。プランは [fork/docs/plans/2026-11-08_order-list-cutoff-setting.md](fork/docs/plans/2026-11-08_order-list-cutoff-setting.md)）。

次回セッションの最初にやること:

1. 出店者発行注文の請求書、請求書なしの理由、ギフト券・コンビニ払いの文言を確認する（[未確認事項](fork/docs/research/2026-11-08_invoice-popover-live.md)）。
2. （任意・低優先）`fork/ideas.md` の案を実装する。
3. ユーザーが解決を確認したら、落とし穴を `../../docs/troubleshooting/`（親リポジトリ）に記録する。

この PC の環境メモ: `python3` は Microsoft Store のスタブで動かない（`npm test` の Python 部分と `npm run test:package` が失敗する。変更前から同じ）。Python は `python`（3.8）を使い、`PYTHONUTF8=1` を付ける。Python 3.8.0 は長い日本語行を含むスクリプトを標準入力・ファイルから読むと「Non-UTF-8 code」で失敗することがあるので、日本語を含む編集は Node で行う。README などは CRLF。
Claude in Chrome は使える（`mcp__claude-in-chrome__*`）が、ユーザーが開いているタブは見えず、新しいタブグループで作業する。ログインは共有される。

## fork/ の説明

フォーク専用のファイルは、上流と衝突しないよう `fork/` にまとめる。調査結果とプランは `FORK.md` に書かず、ここに置く（`FORK.md` は毎回セッション開始時に読み込まれるので短く保つ）。

```
fork/
  ideas.md              ユーザーが箇条書きで書く実装案。プラン済みの項目にはリンクを付ける
  docs/
    features/           実装済みの機能の仕様（フォークが上流に足した分）
    research/           調査レポート（最終更新日・範囲・根拠・未確認事項を書く）
    plans/              AI が作った実装プラン。YYYY-MM-DD_短い名前.md
```

- 現在の中身: `features/invoice-export.md`（適格請求書の保存）、`research/`（[コード読解](fork/docs/research/2026-11-08_receipt-flow-and-payment.md)、[実機調査](fork/docs/research/2026-11-08_invoice-popover-live.md)）、`plans/`（注文一覧の打ち切り設定）。
- 実装が終わったら、仕様を `features/` に書き、`ideas.md` の該当項目と対応する `plans/` のファイルを削除する（完了済みは残さない）。`ideas.md` に状態欄は付けない（リンクあり＝プラン済み、なし＝未着手）。
