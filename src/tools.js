const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { Client } = require("@elastic/elasticsearch");
const { OpenAI } = require("openai");
const { QdrantClient } = require("@qdrant/js-client-rest");
require("dotenv").config();

// Initialize Clients
const esUrl = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
const esClient = new Client({ node: esUrl });

const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
const qdrantClient = new QdrantClient({ url: qdrantUrl });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_BASE,
});

const MAX_SEARCH_RESULTS = 3;

/**
 * XYZシステムのドキュメントを調査するツール
 */
const searchXyzManual = new DynamicStructuredTool({
    name: "search_xyz_manual",
    description: "XYZシステムのドキュメントを調査する関数。エラーコードや固有名詞が質問に含まれる場合は、この関数を使ってキーワード検索を行う。",
    schema: z.object({
        keywords: z.string().describe("全文検索用のキーワード"),
    }),
    func: async ({ keywords }) => {
        console.log(`Searching XYZ manual by keyword: ${keywords}`);
        try {
            const response = await esClient.search({
                index: "documents",
                size: MAX_SEARCH_RESULTS,
                body: {
                    query: {
                        match: {
                            content: keywords,
                        },
                    },
                },
            });

            console.log(`Search results: ${response.hits.hits.length} hits`);
            
            return response.hits.hits.map(hit => ({
                file_name: hit._source.file_name,
                content: hit._source.content
            }));
        } catch (error) {
            console.error("Error searching XYZ manual:", error);
            return [];
        }
    },
});

/**
 * XYZシステムの過去の質問回答ペアを検索するツール
 */
const searchXyzQa = new DynamicStructuredTool({
    name: "search_xyz_qa",
    description: "XYZシステムの過去の質問回答ペアを検索する関数。",
    schema: z.object({
        query: z.string().describe("検索クエリ"),
    }),
    func: async ({ query }) => {
        console.log(`Searching XYZ QA by query: ${query}`);
        try {
            console.log("Generating embedding vector from input query");
            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: query,
            });
            const queryVector = embeddingResponse.data[0].embedding;

            const searchResults = await qdrantClient.search("documents", {
                vector: queryVector,
                limit: MAX_SEARCH_RESULTS,
            });

            console.log(`Search results: ${searchResults.length} hits`);

            return searchResults.map(point => ({
                file_name: point.payload.file_name,
                content: point.payload.content
            }));
        } catch (error) {
            console.error("Error searching XYZ QA:", error);
            return [];
        }
    },
});

module.exports = { searchXyzManual, searchXyzQa };
