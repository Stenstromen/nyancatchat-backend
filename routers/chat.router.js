const express = require("express");
const model = require("../models/chat.model");
const chatRouter = express.Router();

chatRouter.get("/getusers/:room", (req, res) => {
  return res.json(
    model.roomUsers.filter(({ room }) => room === req.params.room)
  );
});

module.exports = chatRouter;
