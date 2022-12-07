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
const { encrypt } = require("./enc/crypto.enc");
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
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("chat message", (msg) => {
    if (msg.message.length >= 125) {
      console.log(`Message from ${msg.user} to large! Aborting`);
      return;
    }
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
