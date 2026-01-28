const { Client } = require('@elastic/elasticsearch');
const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();

async function deleteEsIndex(es, indexName) {
    const exists = await es.indices.exists({ index: indexName });
    if (exists) {
        await es.indices.delete({ index: indexName });
        console.log(`Index '${indexName}' has been deleted.`);
    } else {
        console.log(`Index '${indexName}' does not exist.`);
    }
}

async function deleteQdrantIndex(qdrantClient, collectionName) {
    try {
        const response = await qdrantClient.getCollections();
        const exists = response.collections.some(c => c.name === collectionName);
        
        if (exists) {
            await qdrantClient.deleteCollection(collectionName);
            console.log(`Collection '${collectionName}' has been deleted.`);
        } else {
            console.log(`Collection '${collectionName}' does not exist.`);
        }
    } catch (e) {
        console.error("Error detecting or deleting collection:", e);
    }
}

async function main() {
    const esUrl = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
    const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";

    const es = new Client({ node: esUrl });
    const qdrantClient = new QdrantClient({ url: qdrantUrl });

    const indexName = "documents";

    await deleteEsIndex(es, indexName);
    await deleteQdrantIndex(qdrantClient, indexName);
}

main().catch(console.error);
