const { vectorStore, ragChain, userFilter } = require("../services/langchain");

async function chat(req, res) {
    const { query, limit = 4, documentId } = req.body
    if (!query?.trim()) {
        return res.status(400).send({ message: "Query is required" });
    }

    // 1. Retrieve: embed the query and find the nearest chunks (cosine distance)
    const filter = await userFilter(req.user.id, documentId ? +documentId : undefined)
    const results = await vectorStore.similaritySearchWithScore(query, +limit, filter);

    console.log(JSON.stringify(results))

    /*
        SELECT id, content, vector AS cosine_similarity
        FROM chunks
        WHERE documentId IN (1, 2)
        ORDER BY vector <=> '[1,0.343,1.232]'
        LIMIT 3;
    * */

    // 2. Augment: build context from the retrieved chunks
    const context = results
        .map(([doc], i) => `Source ${i + 1} (page ${doc.metadata.pageNumber}):\n${doc.pageContent}`)
        .join("\n\n---\n\n");

    // 3. Generate: feed context + question to gemini
    const answer = await ragChain.invoke({ context, question: query });

    res.json({
        query,
        answer,
        sources: results.map(([doc, distance]) => ({
            documentId: doc.metadata.documentId,
            page: doc.metadata.pageNumber,
            distance,
        })),
        resultsFound: results.length,
    });
}

module.exports = { chat };
