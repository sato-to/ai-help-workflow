const { StateGraph, END } = require("@langchain/langgraph");
const { ChatOpenAI } = require("@langchain/openai");
const { z } = require("zod");
const { 
    SystemMessage, 
    HumanMessage, 
} = require("@langchain/core/messages");
require("dotenv").config();

const { createSubtaskExecutor } = require("./subgraph");
const { 
    PLANNER_SYSTEM_PROMPT, 
    PLANNER_USER_PROMPT,
    CREATE_LAST_ANSWER_SYSTEM_PROMPT,
    CREATE_LAST_ANSWER_USER_PROMPT
} = require("./prompts");

// --- Schemas ---

const PlanSchema = z.object({
  subtasks: z.array(z.string()).describe("問題を解決するためのサブタスクリスト"),
});

// --- State Definition ---

const agentStateChannels = {
    question: {
        reducer: (a, b) => b,
        default: () => null
    },
    plan: {
        reducer: (a, b) => b,
        default: () => []
    },
    current_step: {
        reducer: (a, b) => b,
        default: () => 0
    },
    subtask_results: { 
        reducer: (a, b) => a.concat(b),
        default: () => []
    },
    last_answer: {
        reducer: (a, b) => b,
        default: () => null
    },
};

// --- Main Agent Implementation ---

class HelpDeskAgent {
    constructor() {
        this.model = new ChatOpenAI({
            modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
            temperature: 0,
        });
    }

    async createPlan(state) {
        console.log("🚀 Starting plan generation process...");
        
        const systemPrompt = PLANNER_SYSTEM_PROMPT;
        const userPrompt = PLANNER_USER_PROMPT.replace("{question}", state.question);
        
        const structuredModel = this.model.withStructuredOutput(PlanSchema);
        
        try {
            const plan = await structuredModel.invoke([
                new SystemMessage(systemPrompt),
                new HumanMessage(userPrompt)
            ]);
            
            console.log("✅ Plan generation complete:", plan.subtasks);
            return { plan: plan.subtasks };
        } catch (error) {
            console.error("Error creating plan:", error);
            throw error;
        }
    }

    async createAnswer(state) {
        console.log("🚀 Starting final answer creation process...");
        
        const subtaskResults = state.subtask_results.map(r => ({
            task_name: r.task_name,
            subtask_answer: r.subtask_answer
        }));

        const userPrompt = CREATE_LAST_ANSWER_USER_PROMPT
            .replace("{question}", state.question)
            .replace("{subtask_results}", JSON.stringify(subtaskResults, null, 2));

        try {
            const response = await this.model.invoke([
                new SystemMessage(CREATE_LAST_ANSWER_SYSTEM_PROMPT),
                new HumanMessage(userPrompt)
            ]);
            
            console.log("✅ Final answer creation complete.");
            return { last_answer: response.content };
        } catch (error) {
             console.error("Error creating final answer:", error);
             throw error;
        }
    }

    createGraph() {
        const workflow = new StateGraph({ channels: agentStateChannels });
        const subgraph = createSubtaskExecutor();

        workflow.addNode("create_plan", this.createPlan.bind(this));
        
        const executeSubtasks = async (state) => {
            const currentSubtask = state.plan[state.current_step];
            console.log(`\n=== Executing Subtask ${state.current_step + 1}: ${currentSubtask} ===\n`);
            
            const result = await subgraph.invoke({
                question: state.question,
                plan: state.plan,
                subtask: currentSubtask,
                challenge_count: 0,
                is_completed: false,
                messages: []
            });

            return {
                subtask_results: [{
                    task_name: result.subtask,
                    tool_results: result.tool_results,
                    reflection_results: result.reflection_results,
                    is_completed: result.is_completed,
                    subtask_answer: result.subtask_answer,
                    challenge_count: result.challenge_count
                }],
                current_step: state.current_step + 1
            };
        };

        workflow.addNode("execute_subtasks", executeSubtasks);
        workflow.addNode("create_answer", this.createAnswer.bind(this));

        workflow.setEntryPoint("create_plan");
        
        workflow.addEdge("create_plan", "execute_subtasks");
        
        workflow.addConditionalEdges(
            "execute_subtasks",
            (state) => {
                if (state.current_step < state.plan.length) {
                    return "execute_subtasks";
                }
                return "create_answer";
            }
        );

        workflow.addEdge("create_answer", END);

        return workflow.compile();
    }
}

// --- Export ---

const agent = new HelpDeskAgent();
const app = agent.createGraph();

async function runAgent(message) {
    console.log(`\n\n[Agent] Starting processing for: ${message}\n`);
    try {
        const result = await app.invoke({ 
            question: message,
            plan: [],
            current_step: 0,
            subtask_results: [],
            last_answer: ""
        });
        return result.last_answer;
    } catch (error) {
        console.error("Agent execution failed:", error);
        return "申し訳ありません。エラーが発生しました。";
    }
}

module.exports = { runAgent };
