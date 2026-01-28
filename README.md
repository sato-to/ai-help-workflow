# AIワークフロースクリプト用Docker環境 (Node.js)

このディレクトリには、ElasticsearchとQdrantを使用してAIワークフロースクリプトをJavaScriptで実行するためのDocker化された環境が含まれています。

## セットアップ

1.  **環境変数の設定**:
    `.env.example` を `.env` にコピーし（作成済み）、OpenAI APIの詳細を入力してください：
    ```bash
    OPENAI_API_KEY=your_key_here
    OPENAI_API_BASE=https://api.openai.com/v1
    OPENAI_MODEL=gpt-4o-mini
    ```

2.  **サービスの起動**:
    ElasticsearchとQdrantをバックグラウンドで起動します：
    ```bash
    docker-compose up -d elasticsearch qdrant
    ```

## スクリプトの実行

`docker-compose run` を使用してスクリプトを実行できます。これにより、スクリプトはDockerネットワーク内で実行され、データベースにアクセスできるようになります。

**インデックスの作成**:
```bash
docker-compose run --rm app node scripts/create_index.js
# または npm script 経由で実行
docker-compose run --rm app npm start
```

**インデックスの削除**:
```bash
docker-compose run --rm app node scripts/delete_index.js
```

## ディレクトリ構成

-   `Dockerfile`: Node.js環境定義
-   `docker-compose.yml`: Node.jsアプリ、Elasticsearch、Qdrantのオーケストレーション設定
-   `package.json`: JavaScriptライブラリの依存関係定義
-   `scripts/`: JavaScriptスクリプト (`create_index.js`, `delete_index.js`)
