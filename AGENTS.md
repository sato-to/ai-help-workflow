# AI Workflow Project Context

このファイルは、AIエージェントが本プロジェクトの構造、仕様、開発環境を迅速に理解し、開発をスムーズに進めるためのコンテキスト情報を提供します。

## 1. プロジェクト概要
- **目的**: システムヘルプデスクAIの実装。
- **機能**:
  - チャット形式のUI (React)
  - 高度なプランニング型AIエージェント (LangGraph.js + OpenAI)
  - Elasticsearchによるナレッジベース検索 (PDFマニュアル + CSV QA)

## 2. アーキテクチャ構成
本プロジェクトは、単純なRAG (Retrieval-Augmented Generation) ではなく、ユーザーの質問を複数のサブタスクに分解して実行し、その結果を統合して回答する「プランニングエージェント」構成を採用しています。

### エージェントのフロー
1.  **Planner**: ユーザーの質問を分析し、解決に必要なサブタスクリスト（実行計画）を作成します。
2.  **Executor (Subgraph)**: 各サブタスクに対して以下を繰り返します（最大3回までリトライ）。
    - **Tool Selection**: 適切な検索ツール（ElasticsearchまたはQdrant）を選択。
    - **Tool Execution**: 検索の実行。
    - **Summarization**: 検索結果からサブタスクの回答を作成。
    - **Reflection**: 回答が十分か評価。不十分な場合はアドバイスを生成してリトライ。
3.  **Final Generator**: 全てのサブタスク結果を統合し、ユーザーへの最終回答を作成します。

## 3. 技術スタック
- **フロントエンド**: React (Vite)
- **バックエンド**: Node.js (Express), LangGraph.js
- **データベース**:
  - **Elasticsearch (v8.11.1)**: キーワード検索 (`search_xyz_manual`)
  - **Qdrant**: ベクトル検索 (`search_xyz_qa`)
- **LLM**: OpenAI GPT-4o-mini (Structured Outputを利用)

## 4. ディレクトリ構成
```
.
├── frontend/           # Reactチャットアプリケーション
├── server.js           # バックエンドAPIサーバー
├── src/
│   ├── agent.js        # メインのエージェントロジック (LangGraph定義)
│   ├── prompts.js      # 各フェーズのプロンプト定義
│   └── tools.js        # 検索ツールの実装 (ES/Qdrant)
├── docker-compose.yml  # コンテナ定義
├── package.json        # 依存ライブラリ
├── scripts/
│   ├── create_index.js # インデックス作成＆データ投入
│   └── debug_agent.js  # エージェント単体デバッグ用スクリプト
└── AGENTS.md           # 本ファイル
```

## 5. 開発ワークフロー

### 起動
```bash
docker-compose up -d --build
```

### データのインデックス作成
```bash
docker-compose run --rm app node scripts/create_index.js
```

### エージェントのデバッグ
エージェントの思考プロセスをCLIで詳細に確認できます。
```bash
docker-compose run --rm app node scripts/debug_agent.js "システムが遅い時の対処法は？"
```

### ログの監視
リアルタイムでエージェントのログ（思考過程や検索実行）を確認できます。
```bash
docker-compose logs -f app
```
