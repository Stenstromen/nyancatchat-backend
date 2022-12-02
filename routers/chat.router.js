const express = require("express");
const model = require("../models/chat.model");
const chatRouter = express.Router();

chatRouter.get("/getusers/:room", (req, res) => {
  //console.log(req.params.room)
  console.log(model.roomUsers.filter(({ room }) => room === req.params.room));
  return res.json(
    model.roomUsers.filter(({ room }) => room === req.params.room)
  );
});

module.exports = chatRouter;
