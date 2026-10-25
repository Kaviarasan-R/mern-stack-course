const express = require("express");
const { upload, getAll, remove } = require("../controllers/documents");
const uploadFile = require("../middlewares/upload");
const verifyToken = require("../middlewares/verifyToken");

const documentRouter = express.Router();

documentRouter.use(verifyToken)
documentRouter.post("/upload", uploadFile.single("file"), upload)
documentRouter.get("/", getAll)
documentRouter.delete("/:id", remove)

module.exports = documentRouter;
