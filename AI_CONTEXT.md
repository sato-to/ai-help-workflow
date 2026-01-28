# AI Workflow Project Context

このファイルは、AIエージェントが本プロジェクトの構造、仕様、開発環境を迅速に理解し、開発をスムーズに進めるためのコンテキスト情報を提供します。

## 1. プロジェクト概要
- **目的**: PDFドキュメントとQAデータを検索可能にするAIワークフローの基盤構築。
- **機能**:
  - キーワード検索 (Elasticsearch)
  - ベクトル検索 (Qdrant)
  - ハイブリッド検索の基盤 (スクリプトで両方のインデックスを作成)

## 2. 技術スタック
- **言語**: JavaScript (Node.js v20)
- **環境**: Docker Desktop (Docker Compose)
- **データベース**:
  - **Elasticsearch (v8.11.1)**:
    - ポート: 9200
    - カスタムイメージ: `elasticsearch/Dockerfile` (プラグイン: `analysis-kuromoji`, `analysis-icu`)
    - 用途: PDFマニュアルの全文検索 (日本語対応)
  - **Qdrant**:
    - ポート: 6333
    - 用途: QAデータのベクトル検索 (OpenAI Embeddings)
- **ライブラリ**:
  - `langchain`: ドキュメントローダー (PDF, CSV)、スプリッター
  - `@elastic/elasticsearch`: ESクライアント
  - `@qdrant/js-client-rest`: Qdrantクライアント
  - `openai`: Embeddings生成

## 3. ディレクトリ構成
```
.
├── .env                # 環境変数 (APIキー等)
├── .env.example        # 環境変数テンプレート
├── .gitignore          # Git除外設定 (node_modules, db_data, .env等)
├── README.md           # ユーザー向け利用ガイド
├── AI_CONTEXT.md       # AIエージェント/開発者向け仕様書 (本ファイル)
├── Dockerfile          # アプリケーション(Node.js)実行環境
├── docker-compose.yml  # コンテナ構成定義 (App, ES, Qdrant, ElasticVue)
├── package.json        # 依存ライブラリ定義
├── elasticsearch/      # Elasticsearch拡張用ディレクトリ
│   └── Dockerfile      # 日本語プラグイン入りカスタムイメージ定義
├── db_data/            # [Git管理外] 永続化データ (Elasticsearch, Qdrant)
├── data/               # [Git管理外] 入力データ (PDF, CSV)
└── scripts/            # 実行スクリプト
    ├── create_index.js # インデックス作成＆データ投入
    ├── check_data.js   # データ登録確認
    └── delete_index.js # インデックス削除
```

## 4. 環境構成詳細

### Docker構成
- **app**: Node.js実行用コンテナ。`scripts/`を実行する。
- **elasticsearch**: カスタムビルド。CORS許可済み (ElasticVue用)。
- **qdrant**: ベクトルDB。
- **elasticvue**: ES確認用GUI (ポート8080)。

### データ永続化
- プロジェクトルートの `db_data/` ディレクトリにバインドマウント。
- `docker-compose down` してもデータは保持される。
- `git clean -fdx` などで削除可能。

### ネットワーク
- 全コンテナは `default` ネットワークで相互通信。
- スクリプト実行時は `docker-compose run --rm app ...` を使用することで、ネットワーク内でホスト名 (`elasticsearch`, `qdrant`) による解決が可能。
- スクリプト内の接続設定は `ELASTICSEARCH_URL`, `QDRANT_URL` 環境変数で制御 (デフォルトは localhost だが、Docker内からはサービス名で解決)。

## 5. 開発ワークフロー

### コンテナの起動・ビルド
Elasticsearchの構成変更（Dockerfile変更）時はビルドが必要。
```bash
docker-compose up -d --build
```

### スクリプトの実行
ホスト側でNode.jsを実行するのではなく、**必ずDockerコンテナ経由で実行**する（ネットワーク接続のため）。
```bash
docker-compose run --rm app node scripts/create_index.js
```

### データの確認
- **Qdrant**: http://localhost:6333/dashboard
- **Elasticsearch**: http://localhost:8080 (ElasticVue)
- **スクリプト**: `docker-compose run --rm app node scripts/check_data.js`

## 6. 現在の課題・注意点
- **OpenAI API**: ベクトル生成に必要。`.env` にキー設定が必須。
- **メモリ**: ElasticsearchとQdrantを同時起動するため、Dockerへの割り当てメモリに注意。
- **インデックス設定**: 現在は固定の `documents` インデックスを使用。
