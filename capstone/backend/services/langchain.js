const { Prisma } = require("@prisma/client")
const { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai")
const { PrismaVectorStore } = require("@langchain/community/vectorstores/prisma")
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters")
const { ChatPromptTemplate } = require("@langchain/core/prompts")
const { StringOutputParser } = require("@langchain/core/output_parsers")
const prisma = require("../prisma/client")
const { GOOGLE_API_KEY: apiKey, GEMINI_MODEL_NAME, GEMINI_EMBEDDING_MODEL, GEMINI_EMBEDDING_DIMENSION } = process.env

const model = new ChatGoogleGenerativeAI({ apiKey, model: GEMINI_MODEL_NAME, temperature: 0.6 })

const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: GEMINI_EMBEDDING_MODEL,
    outputDimensionality: +GEMINI_EMBEDDING_DIMENSION,
})

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 150 })

// Reads & writes the "chunk" table (vector column) through prisma.$queryRaw / $executeRaw
const vectorStore = PrismaVectorStore.withModel(prisma).create(embeddings, {
    prisma: Prisma,
    tableName: "chunk",
    vectorColumnName: "vector",
    columns: {
        id: PrismaVectorStore.IdColumn,
        content: PrismaVectorStore.ContentColumn,
        pageNumber: true,
        documentId: true,
    },
    columnTypes: { id: "integer", documentId: "integer" },
})

const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a research assistant.

Rules:
- Use the provided context as factual grounding.
- You may rephrase, summarize, and synthesize.
- Do NOT invent citations, equations, or claims not supported by context.
- If context is insufficient, say so clearly.

Tone: Clear, Academic, Neutral`],
    ["human", "Context:\n{context}\n\nUser Question: {question}\nAnswer:"],
])

// prompt -> gemini -> plain string
const ragChain = prompt.pipe(model).pipe(new StringOutputParser())

// Vector store filter so a user only searches chunks of THEIR documents (optionally just one document)
async function userFilter(userId, documentId) {
    const documents = await prisma.document.findMany({ where: { userId, id: documentId }, select: { id: true } })
    // SELECT id FROM document WHERE userId = 1 AND id = 2;

    return { documentId: { in: documents.map((document) => document.id) } }
}

module.exports = { model, splitter, vectorStore, ragChain, userFilter };
