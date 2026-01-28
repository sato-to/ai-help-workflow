# AIワークフロースクリプト用Docker環境 (Node.js)

このディレクトリには、ElasticsearchとQdrantを使用してAIワークフロースクリプトをJavaScriptで実行するためのDocker化された環境が含まれています。
また、ReactベースのチャットUIとLangGraphを使用したAIエージェントAPIも含まれています。

## セットアップ

1.  **環境変数の設定**:
    `.env.example` を `.env` にコピーし（作成済み）、OpenAI APIの詳細を入力してください：
    ```bash
    OPENAI_API_KEY=your_key_here
    OPENAI_API_BASE=https://api.openai.com/v1
    OPENAI_MODEL=gpt-4o-mini
    ```

2.  **サービスの起動**:
    すべてのサービス（Frontend, Backend, DBs）を起動します：
    ```bash
    docker-compose up -d --build
    ```

## チャットUIの利用

ブラウザで以下のURLにアクセスしてください：
**http://localhost:5173**

- ユーザーが質問を入力すると、AIエージェントがElasticsearchから関連情報を検索し、OpenAIを使用して回答を生成します。

## スクリプトの実行

`docker-compose run` を使用してスクリプトを実行できます。

**インデックスの作成・データ更新**:
```bash
docker-compose run --rm app node scripts/create_index.js
```
※ PDFデータとCSV(QA)データの両方がElasticsearchとQdrantに登録されます。

**データの確認**:
```bash
docker-compose run --rm app node scripts/check_data.js
```

## ブラウザでのデータ確認

- **Qdrant (ベクトル検索)**: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)
- **Elasticsearch (ElasticVue)**: [http://localhost:8080](http://localhost:8080)
    - 接続先: `http://localhost:9200`

## ディレクトリ構成

-   `frontend/`: React + Vite チャットアプリケーション
-   `server.js`: バックエンドAPIサーバー (Express)
-   `src/agent.js`: LangGraph.js AIエージェントロジック
-   `scripts/`: データ登録・確認用スクリプト
-   `docker-compose.yml`: 全サービスの構成定義
