# AI Chatbot Workflow (LangGraph.js + Elasticsearch)
AI型チャットボットの実装を試すサンプルプロジェクト。  

- ElasticsearchとOpenAIをLangGraph.jsで連携。  
- 質問をサブタスクに分解し、自己修復（リフレクション）を行いながら最適な回答を生成します。

## 特徴
- **Planning Agent**: 質問を解決するためのステップを自動生成。
- **Self-Reflection**: 検索結果が不十分な場合、検索キーワードを変えてリトライ。
- **Hybrid Search**: Elasticsearchによるキーワード検索と、Qdrantによるベクトル検索をツールとして使い分け。
- **React UI**: 洗練されたチャットインターフェース。
- **Dockerized**: 全ての環境（ES, Qdrant, Frontend, Backend）がコンテナで即座に起動可能。

## セットアップ

### 1. 環境変数の設定
`.env` ファイルを作成し、OpenAIのAPIキーを設定してください。

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
ELASTICSEARCH_URL=http://elasticsearch:9200
QDRANT_URL=http://qdrant:6333
```

### 2. 起動
```bash
docker-compose up -d --build
```

### 3. 初期データの投入
PDFおよびCSVデータをインデックスします（`data/` ディレクトリにファイルを配置してください）。
```bash
docker-compose run --rm app node scripts/create_index.js
```

## 使い方
- **チャットUI**: http://localhost:5173
- **デバッグ**: `docker-compose run --rm app node scripts/debug_agent.js "質問"`
- **ES管理 (Elasticvue)**: http://localhost:8080

## 開発・デバッグ
エージェントの詳細な動作仕様は [AGENTS.md](AGENTS.md) を参照してください。
ログのリアルタイム確認は以下のコマンドで行えます。
```bash
docker-compose logs -f app
```
