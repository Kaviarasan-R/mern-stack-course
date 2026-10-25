const express = require("express");
const { chat } = require("../controllers/chat");
const verifyToken = require("../middlewares/verifyToken");

const chatRouter = express.Router();

chatRouter.use(verifyToken)
chatRouter.post("/", chat)

module.exports = chatRouter;
