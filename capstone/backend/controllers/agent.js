const { createUserAgent } = require("../services/agent");

async function ask(req, res) {
    const { query } = req.body
    if (!query?.trim()) {
        return res.status(400).send({ message: "Query is required" });
    }

    // No fixed steps here, gemini decides which tools to call
    // Query: "What all are dsa problems mentioned in the documents ? How many rows in chunks table ?"
    const agent = createUserAgent(req.user.id) // tools only see this user's documents
    const { messages } = await agent.invoke({ messages: [{ role: "user", content: query }] });

    console.log(JSON.stringify(messages));

    res.json({
        query,
        answer: messages.at(-1).text,
        steps: messages.flatMap((message) => message.tool_calls ?? []).map(({ name, args }) => ({ tool: name, args })),
    });
}

module.exports = { ask };
