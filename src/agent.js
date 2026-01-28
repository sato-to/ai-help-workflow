const { StateGraph, END } = require("@langchain/langgraph");
const { ChatOpenAI } = require("@langchain/openai");
const { Client } = require("@elastic/elasticsearch");
require("dotenv").config();

// Elasticsearch Client
const esUrl = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
const esClient = new Client({ node: esUrl });

// OpenAI Model
const model = new ChatOpenAI({
  modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
  temperature: 0,
});

// Define State
// { messages: [], context: "" }

async function retrieve(state) {
  const query = state.messages[state.messages.length - 1];
  console.log(`Searching ES for: ${query}`);

  try {
    const result = await esClient.search({
      index: "documents",
      size: 3,
      body: {
        query: {
          match: {
            content: query,
          },
        },
      },
    });

    const context = result.hits.hits.map((hit) => hit._source.content).join("\n\n");
    console.log(`Retrieved context length: ${context.length}`);
    return { context };
  } catch (error) {
    console.error("Error asking Elasticsearch:", error);
    return { context: "" };
  }
}

async function generate(state) {
  const query = state.messages[state.messages.length - 1];
  const context = state.context;

  const prompt = `
あなたはシステムのヘルプデスク担当者です。
以下のコンテキスト情報（Elasticsearchの検索結果）を参考にして、ユーザーの質問に回答してください。
もしコンテキストに答えが見つからない場合は、「申し訳ありませんが、提供された情報からは回答が見つかりませんでした」と答えてください。

コンテキスト:
${context}

ユーザーの質問:
${query}
`;

  const response = await model.invoke(prompt);
  return { answer: response.content };
}

// Build Graph
const workflow = new StateGraph({
  channels: {
    messages: {
      reducer: (a, b) => a.concat(b),
      default: () => [],
    },
    context: {
      reducer: (a, b) => b,
      default: () => "",
    },
    answer: {
        reducer: (a, b) => b,
        default: () => ""
    }
  },
});

workflow.addNode("retriever", retrieve);
workflow.addNode("generator", generate);

workflow.setEntryPoint("retriever");
workflow.addEdge("retriever", "generator");
workflow.addEdge("generator", END);

const app = workflow.compile();

async function runAgent(message) {
  const result = await app.invoke({ messages: [message] });
  return result.answer;
}

module.exports = { runAgent };
