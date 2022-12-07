const express = require("express");
const model = require("../models/chat.model");
const chatRouter = express.Router();
const con = require("../mysql/db.mysql");
const { decrypt } = require("../enc/crypto.enc");

chatRouter.get("/getusers/:room", (req, res) => {
  return res.json(
    model.roomUsers.filter(({ room }) => room === req.params.room)
  );
});
chatRouter.get("/getmessages/:room/:user", (req, res) => {
  let result_arr = [];

  function setValue(value) {
    result_arr = value;
  }

  con.query("SELECT * FROM msgtable", function (err, rows, fields) {
    if (err) throw err;
    else {
      setValue(rows);
      filterMessageData();
    }
  });

  function filterMessageData() {
    let filtered_arr = [];
    let toclient_arr = [];
    for (let i = 0; i < result_arr.length; i++) {
      filtered_arr.push({
        user: result_arr[i].user,
        room: result_arr[i].room,
        message: {
          iv: result_arr[i].messageiv,
          content: result_arr[i].messagecontent,
        },
      });
    }
    for (let i = 0; i < filtered_arr.length; i++) {
      if (
        filtered_arr[i].user === req.params.user &&
        filtered_arr[i].room === req.params.room
      ) {
        toclient_arr.push({
          origin: "sender",
          user: filtered_arr[i].user.toString(),
          message: decrypt(filtered_arr[i].message).toString(),
        });
      } else if (
        filtered_arr[i].user !== req.params.user &&
        filtered_arr[i].room === req.params.room
      ) {
        toclient_arr.push({
          origin: "server",
          user: filtered_arr[i].user.toString(),
          message: decrypt(filtered_arr[i].message).toString(),
        });
      }
    }
    res.json(toclient_arr);
  }
});

module.exports = chatRouter;
