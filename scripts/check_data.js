const { Client } = require('@elastic/elasticsearch');
const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();

async function checkElasticsearch(es, indexName) {
    console.log("=== Elasticsearch Data Check ===");
    try {
        // インデックスの存在確認と統計情報
        const exists = await es.indices.exists({ index: indexName });
        if (!exists) {
            console.log(`Index '${indexName}' does not exist.`);
            return;
        }

        const stats = await es.indices.stats({ index: indexName });
        const count = stats._all.primaries.docs.count;
        console.log(`Index '${indexName}' exists. Document count: ${count}`);

        if (count > 0) {
            // サンプルデータの取得
            const result = await es.search({
                index: indexName,
                size: 3,
                body: {
                    query: { match_all: {} }
                }
            });

            console.log("\n--- Sample Documents (Top 3) ---");
            result.hits.hits.forEach((hit, i) => {
                console.log(`\n[Doc ${i + 1}] ID: ${hit._id}`);
                console.log(`File: ${hit._source.file_name}`);
                console.log(`Content (truncated): ${hit._source.content.substring(0, 100)}...`);
            });
        }
    } catch (e) {
        console.error("Error checking Elasticsearch:", e.message);
    }
    console.log("\n");
}

async function checkQdrant(qdrantClient, collectionName) {
    console.log("=== Qdrant Data Check ===");
    try {
        const response = await qdrantClient.getCollections();
        const exists = response.collections.some(c => c.name === collectionName);
        
        if (!exists) {
            console.log(`Collection '${collectionName}' does not exist.`);
            return;
        }

        const collectionInfo = await qdrantClient.getCollection(collectionName);
        console.log(`Collection '${collectionName}' exists.`);
        console.log(`Points count: ${collectionInfo.points_count}`);
        console.log(`Vectors count: ${collectionInfo.vectors_count}`);

        if (collectionInfo.points_count > 0) {
            // ポイントのスクロール取得（検索ではなく単純なリスト取得）
            const scrollResult = await qdrantClient.scroll(collectionName, {
                limit: 3,
                with_payload: true,
                with_vector: false // ベクトルデータは表示しない（大きいため）
            });

            console.log("\n--- Sample Points (Top 3) ---");
            scrollResult.points.forEach((point, i) => {
                console.log(`\n[Point ${i + 1}] ID: ${point.id}`);
                if (point.payload) {
                    console.log(`File: ${point.payload.file_name}`);
                    console.log(`Content (truncated): ${point.payload.content ? point.payload.content.substring(0, 100) : 'N/A'}...`);
                }
            });
        }

    } catch (e) {
        console.error("Error checking Qdrant:", e.message);
    }
    console.log("\n");
}

async function main() {
    const esUrl = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
    const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";

    const es = new Client({ node: esUrl });
    const qdrantClient = new QdrantClient({ url: qdrantUrl });

    const indexName = "documents";

    await checkElasticsearch(es, indexName);
    await checkQdrant(qdrantClient, indexName);
}

main().catch(console.error);
