const express = require("express");
const { ask } = require("../controllers/agent");
const verifyToken = require("../middlewares/verifyToken");

const agentRouter = express.Router();

agentRouter.use(verifyToken)
agentRouter.post("/", ask)

module.exports = agentRouter;
