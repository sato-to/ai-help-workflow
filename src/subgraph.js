const { StateGraph, END } = require("@langchain/langgraph");
const { ChatOpenAI } = require("@langchain/openai");
const { z } = require("zod");
const { 
    ToolMessage, 
    SystemMessage, 
    HumanMessage, 
    AIMessage 
} = require("@langchain/core/messages");
require("dotenv").config();

const { searchXyzManual, searchXyzQa } = require("./tools");
const { 
    SUBTASK_SYSTEM_PROMPT,
    SUBTASK_TOOL_EXECUTION_USER_PROMPT,
    SUBTASK_REFLECTION_USER_PROMPT,
    SUBTASK_RETRY_ANSWER_USER_PROMPT,
} = require("./prompts");

const MAX_CHALLENGE_COUNT = 3;

// --- Schemas ---

const ReflectionResultSchema = z.object({
  advice: z.string().describe(
    "評価がNGの場合は、別のツールを試す、別の文言でツールを試すなど、なぜNGなのかとどうしたら改善できるかを考えアドバイスを作成してください。" +
    "アドバイスの内容は過去のアドバイスと計画内の他のサブタスクと重複しないようにしてください。" +
    "アドバイスの内容をもとにツール選択・実行からやり直します。"
  ),
  is_completed: z.boolean().describe(
    "ツールの実行結果と回答から、サブタスクに対して正しく回答できているかの評価結果"
  ),
});

// --- State Definition ---

const agentSubGraphStateChannels = {
    question: {
        reducer: (a, b) => b,
        default: () => null
    },
    plan: {
        reducer: (a, b) => b,
        default: () => []
    },
    subtask: {
        reducer: (a, b) => b,
        default: () => null
    },
    is_completed: {
        reducer: (a, b) => b,
        default: () => false
    },
    messages: { 
        reducer: (a, b) => a.concat(b),
        default: () => []
    },
    challenge_count: {
        reducer: (a, b) => b,
        default: () => 0
    },
    tool_results: { 
        reducer: (a, b) => a.concat(b),
        default: () => []
    },
    reflection_results: { 
        reducer: (a, b) => a.concat(b),
        default: () => []
    },
    subtask_answer: {
        reducer: (a, b) => b,
        default: () => null
    },
};

// --- Subgraph Node Functions ---

class SubtaskExecutor {
    constructor() {
        this.model = new ChatOpenAI({
            modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
            temperature: 0,
        });
        this.tools = [searchXyzManual, searchXyzQa];
        this.toolMap = {
            search_xyz_manual: searchXyzManual,
            search_xyz_qa: searchXyzQa
        };
    }

    async selectTools(state) {
        console.log("🚀 Starting tool selection process...");
        
        let messages = [];
        let newMessages = [];
        
        if (state.challenge_count === 0) {
            const userPrompt = SUBTASK_TOOL_EXECUTION_USER_PROMPT
                .replace("{question}", state.question)
                .replace("{plan}", JSON.stringify(state.plan))
                .replace("{subtask}", state.subtask);

            newMessages = [
                new SystemMessage(SUBTASK_SYSTEM_PROMPT),
                new HumanMessage(userPrompt)
            ];
            messages = newMessages;
        } else {
            console.log("Creating user prompt for tool retry...");
            
            const filteredMessages = state.messages.filter(msg => {
                 const type = msg._getType ? msg._getType() : (msg.role || 'ai');
                 if (type === 'tool') return false;
                 if (type === 'ai' && msg.tool_calls && msg.tool_calls.length > 0) return false;
                 return true;
            });
            
            const userRetryMessage = new HumanMessage(SUBTASK_RETRY_ANSWER_USER_PROMPT);
            newMessages = [userRetryMessage];
            messages = [...filteredMessages, userRetryMessage];
        }

        try {
            const modelWithTools = this.model.bindTools(this.tools);
            const response = await modelWithTools.invoke(messages);
            
            console.log("✅ Tool selection complete.");
            
            return { messages: [...newMessages, response] };
        } catch (error) {
            console.error("Error selecting tools:", error);
            throw error;
        }
    }

    async executeTools(state) {
        console.log("🚀 Starting tool execution process...");
        const messages = state.messages;
        const lastMessage = messages[messages.length - 1];
        const toolCalls = lastMessage.tool_calls;

        if (!toolCalls || toolCalls.length === 0) {
            console.error("Tool calls are missing");
            throw new Error("Tool calls are None");
        }

        const toolResults = [];
        const toolMessages = [];

        for (const toolCall of toolCalls) {
            const tool = this.toolMap[toolCall.name];
            if (!tool) {
                console.error(`Tool ${toolCall.name} not found`);
                continue;
            }

            console.log(`Executing tool: ${toolCall.name}`);
            const result = await tool.invoke(toolCall.args);
            
            toolResults.push({
                tool_name: toolCall.name,
                args: toolCall.args,
                results: result
            });

            toolMessages.push(new ToolMessage({
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
            }));
        }

        console.log("Tool execution complete!");
        return { messages: toolMessages, tool_results: [toolResults] };
    }

    async createSubtaskAnswer(state) {
        console.log("🚀 Starting subtask answer creation process...");
        const messages = state.messages;
        
        try {
            const response = await this.model.invoke(messages);
            console.log("✅ Subtask answer creation complete.");
            return { 
                messages: [response], 
                subtask_answer: response.content 
            };
        } catch (error) {
            console.error("Error creating subtask answer:", error);
            throw error;
        }
    }

    async reflectSubtask(state) {
        console.log("🚀 Starting reflection process...");
        const messages = state.messages;
        
        const reflectionUserPrompt = new HumanMessage(SUBTASK_REFLECTION_USER_PROMPT);
        const inputMessages = [...messages, reflectionUserPrompt];
        
        const structuredModel = this.model.withStructuredOutput(ReflectionResultSchema);
        
        try {
            const reflectionResult = await structuredModel.invoke(inputMessages);
            console.log("✅ Reflection complete:", reflectionResult);
            
            const aiMessage = new AIMessage({ content: JSON.stringify(reflectionResult) });
            
            const updateState = {
                messages: [reflectionUserPrompt, aiMessage],
                reflection_results: [reflectionResult],
                challenge_count: state.challenge_count + 1,
                is_completed: reflectionResult.is_completed,
            };

            if (updateState.challenge_count >= MAX_CHALLENGE_COUNT && !reflectionResult.is_completed) {
                updateState.subtask_answer = `${state.subtask}の回答が見つかりませんでした。`;
            }

            return updateState;
        } catch (error) {
            console.error("Error reflecting:", error);
            throw error;
        }
    }

    createGraph() {
        const workflow = new StateGraph({ channels: agentSubGraphStateChannels });

        workflow.addNode("select_tools", this.selectTools.bind(this));
        workflow.addNode("execute_tools", this.executeTools.bind(this));
        workflow.addNode("create_subtask_answer", this.createSubtaskAnswer.bind(this));
        workflow.addNode("reflect_subtask", this.reflectSubtask.bind(this));

        workflow.setEntryPoint("select_tools");
        workflow.addEdge("select_tools", "execute_tools");
        workflow.addEdge("execute_tools", "create_subtask_answer");
        workflow.addEdge("create_subtask_answer", "reflect_subtask");

        workflow.addConditionalEdges(
            "reflect_subtask",
            (state) => {
                if (state.is_completed || state.challenge_count >= MAX_CHALLENGE_COUNT) {
                    return END;
                }
                return "select_tools";
            }
        );

        return workflow.compile();
    }
}

// --- Export ---

function createSubtaskExecutor() {
    const executor = new SubtaskExecutor();
    return executor.createGraph();
}

module.exports = { createSubtaskExecutor };
