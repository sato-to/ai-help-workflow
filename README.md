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

**データの確認**:
作成されたインデックスやデータの中身を確認します。
```bash
docker-compose run --rm app node scripts/check_data.js
```

**インデックスの削除**:
```bash
docker-compose run --rm app node scripts/delete_index.js
```

## ブラウザでのデータ確認

**1. Qdrant (ベクトル検索エンジン)**
Qdrantには標準でダッシュボードが組み込まれています。
- URL: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)
- 機能: コレクションの確認、検索クエリの実行が可能です。

**2. Elasticsearch (キーワード検索エンジン)**
データの確認用に **ElasticVue** というGUIツールを追加しました。
- URL: [http://localhost:8080](http://localhost:8080)
- 使い方:
    1. 上記URLにアクセス
    2. 接続画面が出る場合、「Add cluster」で `http://localhost:9200` を指定（Docker内ではなくブラウザからアクセスするため localhost でOK）
    3. 左メニューの「Indices」から `documents` インデックスを選択し、「Search」タブでデータを確認できます。

## コマンドラインでの確認（代替手段）

## ディレクトリ構成

-   `Dockerfile`: Node.js環境定義
-   `docker-compose.yml`: Node.jsアプリ、Elasticsearch、Qdrantのオーケストレーション設定
-   `package.json`: JavaScriptライブラリの依存関係定義
-   `scripts/`: JavaScriptスクリプト
    -   `create_index.js`: インデックス作成とデータ投入
    -   `delete_index.js`: インデックス削除
    -   `check_data.js`: データ確認用
