const con = require("./mysql/db.mysql");
const bodyParser = require("body-parser");
const compression = require("compression");
const express = require("express");
const app = express();
const chatRouter = require("./routers/chat.router");
const http = require("http").Server(app);
const cors = require("cors");
app.use(cors());
app.use((req, res, next) => {
  if (
    !req.headers.authorization ||
    req.headers.authorization !== process.env.AUTHHEADER_PASSWORD
  ) {
    return res.status(403).json({ error: "Invalid or no credentials" });
  }
  next();
});
const io = require("socket.io")(http, {
  cors: {
    origin: process.env.CORS_ORIGIN,
  },
});

const model = require("./models/chat.model");
const { encrypt, decrypt } = require("./enc/crypto.enc");
const getTime = () => {
  const dateObj = new Date();
  let hour = dateObj.getHours();
  let minute = dateObj.getMinutes();
  hour = ("0" + hour).slice(-2);
  minute = ("0" + minute).slice(-2);
  return hour + ":" + minute;
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(compression());
app.use(chatRouter);

io.on("connection", (socket) => {
  console.log("a user connected" + socket.id);

  socket.on("leave_room", (data) => {
    socket.to(data.room).emit("user leaves", {
      origin: "MasterServer",
      time: getTime(),
      user: "🖥 Server",
      message: data.user + " has left " + data.room + " 😿",
      room: data.room,
    });

    const idxObj = model.roomUsers.findIndex((object) => {
      return object.user === data.user;
    });
    model.roomUsers.splice(idxObj, 1);

    socket.leave(data.room);
    socket.to(data.room).emit("user join", model.roomUsers);

    console.log(`${socket.id} has left room ${data.room}`);

    if (!socket.rooms.has(data.room)) return;

    if (model.checkForMessagesUser(data.user) == 0) return;

    model.deleteMessages(data.user);
  });

  socket.on("join_room", (data) => {
    if (socket.rooms.has(data.room)) {
      console.log(`${socket.id} has already joined ${data.room}`);
    } else {
      console.log(`${socket.id} has joined ${data.room}`);

      socket.to(data.room).emit("user joines", {
        origin: "MasterServer",
        time: getTime(),
        user: "🖥 Server",
        message: data.user + " has joined " + data.room + " 😻",
        room: data.room,
      });

      socket.join(data.room);
      model.roomUsersFunc(data.room, data.user);
      socket.to(data.room).emit("user join", model.roomUsers);

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
          if (filtered_arr[i].user === data.user) {
            let packet = {
              origin: "sender",
              user: filtered_arr[i].user.toString(),
              message: decrypt(filtered_arr[i].message).toString(),
            };

            socket.emit("chat message", packet); //sending to sender-client only
          } else if (filtered_arr[i].user !== data.user) {
            let packet = {
              origin: "server",
              user: filtered_arr[i].user.toString(),
              message: decrypt(filtered_arr[i].message).toString(),
            };
            socket.emit("chat message", packet); //sending to sender-client only
          }
        }
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("chat message", (msg) => {
    let packet = {
      user: msg.user,
      message: encrypt(msg.message),
      room: msg.room,
    };
    socket.to(msg.room).emit("chat message", {
      origin: "server",
      time: getTime(),
      user: msg.user,
      message: msg.message,
      room: msg.room,
    });
    socket.emit("chat message", {
      origin: "sender",
      time: getTime(),
      user: msg.user,
      message: msg.message,
      room: msg.room,
    }); //sending to sender-client only
    model.insertMessage(
      packet.user,
      packet.message.content,
      packet.message.iv,
      packet.room
    );
  });

  socket.on("typing", (data) => {
    socket.to(data.room).emit("typing Response", data);
  });
});
http.listen(8080, () => {
  console.log("Server listening on localhost:8080");
});
