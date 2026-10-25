const { createAgent, tool } = require("langchain")
const prisma = require("../prisma/client")
const { model, vectorStore, userFilter } = require("./langchain")

// Tools are created per user (userId comes from the access token), so the AI can only reach that user's data

// TOOL 1: RAG over uploaded PDFs (same retrieval as /api/chat)
const searchDocuments = (userId) => tool(
    async ({ query, documentId }) => {
        // Retrieve
        const filter = await userFilter(userId, documentId)
        const docs = await vectorStore.similaritySearch(query, 4, filter)
        if (!docs.length) return "No matching content found in the uploaded PDFs."

        // Augment
        return docs
            .map((doc, i) => `Source ${i + 1} (document ${doc.metadata.documentId}, page ${doc.metadata.pageNumber}):\n${doc.pageContent}`)
            .join("\n\n---\n\n")
    },
    {
        name: "search_documents",
        description: "Semantic search over the CONTENT of the uploaded PDFs. Use for questions about what the documents say.",
        schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "What to search for" },
                documentId: { type: "integer", description: "Only search inside this document id, optional" },
            },
            required: ["query"],
        },
    }
)

// TOOL 2: Text-to-SQL, the AI writes the query itself
const queryDatabase = (userId) => tool(
    async ({ sql }) => {
        if (!/^\s*(select|with)\b/i.test(sql)) return "Error: only SELECT queries are allowed."
        // Never let the AI read the user table (passwords, refresh tokens) or go around the scoping below
        if (/\b(user|public|pg_\w+|information_schema)\b/i.test(sql)) return "Error: only the document and chunk tables are allowed."

        // "document" and "chunk" here are temporary tables (CTE) holding ONLY this user's rows.
        // They hide the real tables, so whatever the AI writes, it can't see other users' files.
        const scopedSql = `WITH document AS (SELECT * FROM public.document WHERE "userId" = $1),
chunk AS (SELECT * FROM public.chunk WHERE "documentId" IN (SELECT id FROM document))
SELECT * FROM (${sql.replace(/;\s*$/, "")}) AS result`

        try {
            const rows = await prisma.$queryRawUnsafe(scopedSql, userId)
            // count(*) comes back as a BigInt, which JSON.stringify can't handle, so turn it into a normal number
            return JSON.stringify(rows, (key, value) => typeof value === "bigint" ? Number(value) : value)
        } catch (err) {
            return `Error: ${err.message}` // AI reads the error and can fix its own query
        }
    },
    {
        name: "query_database",
        description: `Run a read-only PostgreSQL SELECT query. Use for questions ABOUT the uploaded files (counts, names, pages, dates), not their content.
Tables (already filtered to the current user's files):
- "document" (id int, filename text, pages int, "createdAt" timestamp)
- "chunk" (id int, content text, "pageNumber" int, "documentId" int -> document.id)
camelCase columns must be double quoted. Never select chunk.vector.`,
        schema: {
            type: "object",
            properties: {
                sql: { type: "string", description: "A single PostgreSQL SELECT query" },
            },
            required: ["sql"],
        },
    }
)

// AGENT: gemini decides which tool to call (or none), reads the result and loops until it can answer
const createUserAgent = (userId) => createAgent({
    model,
    tools: [searchDocuments(userId), queryDatabase(userId)],
    systemPrompt: `You are a research assistant for the user's uploaded PDFs.
- Questions about what the PDFs say: use search_documents.
- Questions about the uploaded files themselves (how many, names, pages, dates): use query_database.
- Greetings or general questions: answer directly without tools.
Ground your answers in tool results and never invent facts. If the results are insufficient, say so.`,
})

module.exports = { createUserAgent, searchDocuments, queryDatabase };
