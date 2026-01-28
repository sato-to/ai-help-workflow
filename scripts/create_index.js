const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { Client } = require('@elastic/elasticsearch');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { OpenAI } = require('openai');
const { PDFLoader } = require('langchain/document_loaders/fs/pdf');
const { CSVLoader } = require('langchain/document_loaders/fs/csv');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
require('dotenv').config();

// Settings equivalent
const settings = {
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_api_base: process.env.OPENAI_API_BASE,
    openai_model: process.env.OPENAI_model,
};

async function loadPdfDocs(dataDirPath) {
    const pdfPaths = await glob(path.join(dataDirPath, "**", "*.pdf"));
    const docs = [];
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 300,
        chunkOverlap: 20,
    });

    for (const p of pdfPaths) {
        const loader = new PDFLoader(p);
        const pages = await loader.loadAndSplit(textSplitter);
        docs.push(...pages);
    }
    return docs;
}

async function loadCsvDocs(dataDirPath) {
    const csvPaths = await glob(path.join(dataDirPath, "**", "*.csv"));
    const docs = [];

    for (const p of csvPaths) {
        const loader = new CSVLoader(p);
        const loadedDocs = await loader.load();
        docs.push(...loadedDocs);
    }
    return docs;
}

async function createKeywordSearchIndex(es, indexName) {
    const mapping = {
        mappings: {
            properties: {
                content: {
                    type: "text",
                    analyzer: "kuromoji_analyzer",
                }
            },
        },
        settings: {
            analysis: {
                analyzer: {
                    kuromoji_analyzer: {
                        type: "custom",
                        char_filter: ["icu_normalizer"],
                        tokenizer: "kuromoji_tokenizer",
                        filter: [
                            "kuromoji_baseform",
                            "kuromoji_part_of_speech",
                            "ja_stop",
                            "kuromoji_number",
                            "kuromoji_stemmer",
                        ],
                    }
                }
            }
        },
    };

    const exists = await es.indices.exists({ index: indexName });
    if (!exists) {
        try {
            await es.indices.create({ index: indexName, body: mapping });
            console.log(`Index ${indexName} created successfully`);
        } catch (e) {
            console.error(`Failed to create index ${indexName}`, e);
        }
    } else {
        console.log(`Index ${indexName} already exists`);
    }
}

async function createVectorSearchIndex(qdrantClient, indexName) {
    try {
        const result = await qdrantClient.createCollection(indexName, {
            vectors: {
                size: 1536,
                distance: 'Cosine',
            }
        });
        if (result) {
            console.log(`Collection ${indexName} created successfully`);
        }
    } catch (e) {
        // Qdrant client might throw if collection exists or other errors
        console.log(`Note: Collection creation might have failed or already exists. Error: ${e.message}`);
    }
}

async function addDocumentsToEs(es, indexName, docs) {
    const insertDocs = [];
    for (const doc of docs) {
        insertDocs.push({
            index: { _index: indexName }
        });
        insertDocs.push({
            file_name: path.basename(doc.metadata.source),
            content: doc.pageContent,
        });
    }

    if (insertDocs.length > 0) {
        await es.bulk({ operations: insertDocs });
    }
}

async function addDocumentsToQdrant(qdrantClient, indexName, docs, settings) {
    const points = [];
    const client = new OpenAI({
        apiKey: settings.openai_api_key,
        baseURL: settings.openai_api_base // Optional if using default
    });

    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        let content = doc.pageContent;
        content = content.replace(/\s+/g, ""); // Remove spaces
        
        try {
            const embedding = await client.embeddings.create({
                model: "text-embedding-3-small",
                input: content,
            });

            points.push({
                id: i,
                vector: embedding.data[0].embedding,
                payload: {
                    file_name: path.basename(doc.metadata.source),
                    content: content,
                },
            });
        } catch (e) {
            console.error(`Error embedding document ${i}:`, e);
        }
    }

    if (points.length > 0) {
        await qdrantClient.upsert(indexName, {
            points: points,
            wait: true,
        });
        console.log("Upserted points to Qdrant");
    }
}

async function main() {
    const esUrl = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
    const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";

    const es = new Client({ node: esUrl });
    const qdrantClient = new QdrantClient({ url: qdrantUrl });

    const indexName = "documents";
    
    console.log(`Creating index for keyword search ${indexName}`);
    await createKeywordSearchIndex(es, indexName);
    console.log("--------------------------------");

    console.log(`Creating index for vector search ${indexName}`);
    await createVectorSearchIndex(qdrantClient, indexName);
    console.log("--------------------------------");

    console.log("Loading documents from manual data");
    const manualDocs = await loadPdfDocs("data");
    console.log(`Loaded ${manualDocs.length} documents`);
    console.log("--------------------------------");

    console.log("Loading documents from qa data");
    const qaDocs = await loadCsvDocs("data");
    console.log(`Loaded ${qaDocs.length} documents`);
    console.log("--------------------------------");

    console.log("Adding documents to keyword search index");
    await addDocumentsToEs(es, indexName, manualDocs);
    await addDocumentsToEs(es, indexName, qaDocs);
    console.log("--------------------------------");

    console.log("Adding documents to vector search index");
    await addDocumentsToQdrant(qdrantClient, indexName, qaDocs, settings);
    console.log("--------------------------------");
    console.log("Done");
}

main().catch(console.error);
