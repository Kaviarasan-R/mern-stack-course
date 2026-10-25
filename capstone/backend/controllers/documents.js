const { WebPDFLoader } = require("@langchain/community/document_loaders/web/pdf");
const prisma = require("../prisma/client");
const { splitter, vectorStore } = require("../services/langchain");

async function upload(req, res) {
    if (!req.file) {
        return res.status(400).send({ message: "PDF file is required" });
    }

    // 1. Extract text (one langchain Document per page)
    const pages = await new WebPDFLoader(new Blob([req.file.buffer])).load();

    console.log(pages, pages[0].metadata)

    // 2. Split into overlapping chunks
    const chunks = await splitter.splitDocuments(pages);
    if (!chunks.length) {
        return res.status(422).send({ message: "No text found in PDF" });
    }

    console.log(chunks, chunks.length)

    // 3. Store document + chunks (vector is NULL for now)
    const document = await prisma.document.create({
        data: {
            filename: req.file.originalname,
            pages: pages[0].metadata.pdf.totalPages,
            userId: req.user.id,
            chunks: {
                create: chunks.map((chunk) => ({
                    content: chunk.pageContent,
                    pageNumber: chunk.metadata.loc?.pageNumber,
                })),
            },
        },
        include: { chunks: true },
    });

    // 4. Embed chunks with gemini and UPDATE chunk SET vector = ... WHERE id = ...
    try {
        await vectorStore.addModels(document.chunks);
    } catch (err) {
        await prisma.document.delete({ where: { id: document.id } });
        throw err;
    }

    return res.status(201).send({
        id: document.id,
        filename: document.filename,
        pages: document.pages,
        chunks: document.chunks.length,
        status: "ingested",
    });
}

async function getAll(req, res) {
    res.json(await prisma.document.findMany({
        where: { userId: req.user.id },
        include: { _count: { select: { chunks: true } } },
    }));
}

async function remove(req, res) {
    // userId in where, so a user can't delete someone else's document
    const document = await prisma.document.findFirst({ where: { id: +req.params.id, userId: req.user.id } });
    if (!document) {
        return res.status(404).send({ message: "Document not found" });
    }

    res.json(await prisma.document.delete({ where: { id: document.id } }));
}

module.exports = { upload, getAll, remove };
