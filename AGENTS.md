# AI Workflow Project Context

このファイルは、AIエージェントが本プロジェクトの構造、仕様、開発環境を迅速に理解し、開発をスムーズに進めるためのコンテキスト情報を提供します。

## 1. プロジェクト概要
- **目的**: システムヘルプデスクAIの実装。
- **機能**:
  - チャット形式のUI (React)
  - AIエージェントによる回答 (LangGraph.js + OpenAI)
  - Elasticsearchによるナレッジベース検索 (PDFマニュアル + CSV QA)

## 2. 技術スタック
- **フロントエンド**: React (Vite)
- **バックエンド**: Node.js (Express), LangGraph.js
- **データベース**:
  - **Elasticsearch (v8.11.1)**:
    - ポート: 9200
    - カスタムイメージ: `analysis-kuromoji`, `analysis-icu` プラグイン導入済み
    - 用途: 全文検索 (PDF, CSV)
  - **Qdrant**:
    - ポート: 6333
    - 用途: ベクトル検索 (現在はQAデータのみ格納だが、エージェントは主にESを使用)
- **環境**: Docker Desktop (Docker Compose)

## 3. ディレクトリ構成
```
.
├── frontend/           # [NEW] ReactチャットアプリケーションとDockerfile
├── server.js           # [NEW] バックエンドAPIサーバー
├── src/agent.js        # [NEW] LangGraphエージェントロジック
├── docker-compose.yml  # コンテナ構成定義 (App, Frontend, ES, Qdrant, ElasticVue)
├── package.json        # バックエンド依存ライブラリ定義
├── elasticsearch/      # Elasticsearch拡張用ディレクトリ
├── db_data/            # [Git管理外] 永続化データ
├── data/               # [Git管理外] 入力データ (PDF, CSV)
├── scripts/            # 実行スクリプト
│   ├── create_index.js # インデックス作成＆データ投入 (ESにQAデータも追加)
│   ├── check_data.js   # データ登録確認
│   └── delete_index.js # インデックス削除
└── AGENTS.md           # 本ファイル
```

## 4. 環境構成詳細

### Docker構成
- **app**: バックエンドサーバー＆スクリプト実行用。Port 3000。
- **frontend**: チャットUI。Port 5173。
- **elasticsearch**: 検索エンジン。
- **qdrant**: ベクトルDB。
- **elasticvue**: ES確認用GUI。Port 8080。

### ネットワーク・データ
- 全コンテナは `default` ネットワークで通信。
- データは `db_data/` に永続化。

## 5. 開発ワークフロー

### 起動
```bash
docker-compose up -d --build
```

### チャット利用
ブラウザで **http://localhost:5173** にアクセス。

### データのインデックス作成
```bash
docker-compose run --rm app node scripts/create_index.js
```
※ PDFとCSVの両方がElasticsearchの `documents` インデックスに登録されます。

### エージェントのロジック (`src/agent.js`)
1. ユーザーの質問を受け取る。
2. Elasticsearchを検索し、関連テキストを取得。
3. OpenAI (GPT-4) にコンテキストと質問を渡し、回答を生成。
