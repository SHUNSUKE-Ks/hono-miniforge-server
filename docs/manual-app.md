# アプリ・開発者向けマニュアル
## Hono MiniForge — 開発ガイド

**対象:** 開発者 / プロジェクト管理者  
**環境:** Windows 11 / Node.js / Vercel

---

## プロジェクト全体構成

```
Hono_MiniForge/
├── 01_Server/          ← Hono サーバー（このリポジトリ）
│   ├── app.js          ← Hono アプリ本体（CORS込み）
│   ├── server.js       ← ローカル開発専用（node server.js で起動）
│   ├── api/index.js    ← Vercel エントリポイント
│   ├── routes/
│   │   ├── bs01.js     ← バトル API
│   │   ├── pzl.js      ← パズル API
│   │   └── novel.js    ← ノベル API（拡張予定）
│   ├── data/puzzles/   ← パズルデータ PZL-001〜010
│   ├── assets/skins/   ← スキン定義 JSON
│   ├── docs/           ← マニュアル MD ファイル
│   ├── sheet.html      ← ノベルゲーム生成シート（静的配信）
│   ├── manual.html     ← マニュアルビューア（静的配信）
│   └── vercel.json     ← Vercel 設定
├── 02_Games/           ← 各ゲームのフロントエンド
│   ├── BS01_CommandBattle/
│   ├── PZL01_MiniGame/
│   ├── CARD01_CardGame/
│   └── SRPG01_MapBattle/
├── 10_Gallery/         ← ゲーム一覧ポータル（Vite）
└── 00_Report/          ← 開発ログ
```

---

## GitHub / Vercel

| 項目 | 内容 |
|------|------|
| リポジトリ | `https://github.com/SHUNSUKE-Ks/hono-miniforge-server` |
| Vercel デプロイ | `main` ブランチへの push で自動デプロイ |
| ルートディレクトリ | `/`（01_Server の中身がルート） |
| Framework Preset | Other |

---

## ローカル開発環境のセットアップ

```bash
cd 01_Server
npm install
node server.js
# → http://localhost:3000 で起動
```

ローカルで動作確認後 `git push` すれば Vercel に自動反映されます。

---

## API エンドポイント一覧

### ベース URL
- ローカル: `http://localhost:3000`
- 本番: `https://xxx.vercel.app`

### パズル API

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/pzl/start` | パズル初期化・セッション発行 |
| POST | `/api/pzl/action` | タイル操作（move_index または state） |
| POST | `/api/pzl/check` | 解答最終判定 |
| GET | `/api/pzl/hint/:id/:step` | ヒント取得 |
| GET | `/api/pzl/skin/:id` | スキン JSON 取得 |
| GET | `/api/pzl/list` | パズル一覧（PZL-001〜010） |
| GET | `/api/pzl/state/:sess` | セッション状態復元 |

### バトル API

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/bs01/start` | バトル初期化・敵生成 |
| POST | `/api/bs01/action` | コマンド実行（攻撃/魔法/アイテム/逃げる） |

### ノベル API（拡張予定）

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/novel/sheet/:id` | シート JSON 取得（将来実装） |
| POST | `/api/novel/sheet` | シート保存（Vercel KV 実装後） |

---

## CORS 設定

`app.js` で `/api/*` に CORS ミドルウェアを適用しています。

```js
// 許可オリジン
const allowedOrigins = [
  'http://localhost:5173',  // Vite dev（各ゲーム）
  'http://localhost:4173',  // Vite preview
  'http://localhost:3000',  // サーバー自身
  // 本番追加は環境変数 GAME_CENTER_ORIGIN で設定
]
```

本番でゲームクライアントのドメインを追加するには  
Vercel ダッシュボード → Environment Variables → `GAME_CENTER_ORIGIN` を設定。

---

## 静的ファイルの配信

Vercel は `/api/*` 以外のパスを静的ファイルとして自動配信します。

| URL | ファイル |
|-----|---------|
| `/sheet.html` | ノベルゲーム生成シート |
| `/manual.html` | マニュアルビューア |
| `/docs/manual-android.md` | Android向け MD |
| `/docs/manual-app.md` | 開発者向け MD |
| `/assets/skins/:id.json` | スキン定義 |

---

## セッション管理の注意点

`pzl.js` のセッションは `Map` でメモリ管理しています。

```js
const sessions = new Map()
```

**Vercel Serverless では関数が再起動するたびにセッションが消えます。**

将来的には以下のいずれかに移行予定:
- **Vercel KV**（Redis）
- **Upstash**
- **D1**（Cloudflare Workers）

現時点では `start → action → check` を連続して実行するテスト用途での使用に限定。

---

## ノベルゲーム生成シート (sheet.html)

Android/PC ブラウザから直接アクセスできる単一 HTML ファイルです。

### 出力 JSON 構造

```json
{
  "meta": {
    "schema_version": "1.0",
    "label": "表示名",
    "id": "file_id",
    "memo": "概要",
    "thumbnail": "base64...",
    "created_at": "ISO8601"
  },
  "world": {
    "name": "", "civilization": "", "power": "", "taboo": "", "problem": ""
  },
  "characters": [
    { "characterID": "CHAR_001", "role": "protagonist", ... },
    { "characterID": "CHAR_002", "role": "heroine", ... }
  ],
  "systems": ["branch", "affection", "battle"],
  "scenario": {
    "first_incident": "", "player_objective": "", "chapter1_event": ""
  },
  "custom_code": null,
  "_api_endpoint": "/api/novel/sheet/file_id"
}
```

### 将来の拡張接続

`sheet.html` 内に以下のコードがコメントアウト済みです：

```js
// async function saveToServer(json) {
//   const res = await fetch('/api/novel/sheet', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(json),
//   });
// }
```

`/api/novel/sheet` エンドポイントを実装したらコメントを外すだけで接続できます。

---

## 10_Gallery（ゲームポータル）

`10_Gallery/` は Vite で動くゲーム一覧サイトです。

```bash
cd 10_Gallery
npm install
npm run dev  # → http://localhost:5176（または空きポート）
```

`src/games.js` にゲームを追加するだけで一覧に表示されます。

```js
// 新しいゲームを追加する場合
{
  id: 'novel01',
  genre: 'NOVEL',
  title: 'Gray Knight',
  description: '...',
  status: 'wip',
  devPort: 5177,
  distPath: '../02_Games/NOVEL01/dist/index.html',
}
```

---

## デプロイ手順

```bash
# 01_Server での作業
cd 01_Server

# 変更をステージング・コミット
git add .
git commit -m "feat: ..."

# push すると Vercel が自動デプロイ
git push
```

---

## 開発ログの保存場所

| 部門 | 保存先 |
|------|--------|
| サーバー全般 | `00_Report/` 直下 |
| PZL パズル系 | `00_Report/PZL_Puzzle/` |
| BS バトル系 | `00_Report/BS_CommandBattle/` |
| CARD カード系 | `00_Report/CARD_CardGame/` |
| SRPG 系 | `00_Report/SRPG_MapBattle/` |
| 日次振り返り | `00_Report/_AgentReview/` |

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-04-13 | 初版作成 / sheet.html・manual.html 追加 |
| 2026-04-13 | Vercel デプロイ・GitHub push 完了 |
| 2026-04-13 | CORS ミドルウェア追加（app.js） |
