const { runAgent } = require('../src/agent');

async function main() {
    const query = process.argv[2];
    if (!query) {
        console.error("Usage: node scripts/debug_agent.js 'Your question here'");
        process.exit(1);
    }

    console.log(`\n--- Debugging Agent with query: "${query}" ---\n`);
    
    try {
        const answer = await runAgent(query);
        console.log("\n--- Agent Response ---\n");
        console.log(answer);
        console.log("\n----------------------\n");
    } catch (error) {
        console.error("Error running agent:", error);
    }
}

main();
