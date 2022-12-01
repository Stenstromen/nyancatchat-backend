const con = require("./mysql/db.mysql");
const bodyParser = require("body-parser");
const compression = require("compression");
const express = require("express");
const app = express();
const http = require('http').Server(app);
const cors = require('cors');
app.use(cors());
const io = require('socket.io')(http, {
  cors: {
      origin: "http://localhost:3000"
  }
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

let sharedlinkjoin = false;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(compression());

app.post("/user", (req, res) => {
  key = req.body.key;
  username = req.body.username;
  room = req.body.room;
  res.redirect("/user");
});

/* app.get("/user", (req, res) => {
  if (req.query.username && req.query.room && req.query.key) {
    username = req.query.username;
    room = req.query.room;
    key = req.query.key;
    sharedlinkjoin = true;
  }
  res.render("chatindex.ejs", {
    username: username,
    room: room,
    key: key,
    shareUsername: shareUsername(),
    sharedlinkjoin: sharedlinkjoin,
  });
});

app.get("/", (req, res, next) => {
  res.render("index.ejs", {
    username: username,
    room: room,
    genKey: genKey(),
    shareUsername: shareUsername(),
    nyanRoomBusy: nyanRoomBusy,
    dogeRoomBusy: dogeRoomBusy,
    pusheenRoomBusy: pusheenRoomBusy,
  });
}); */

io.on("connection", (socket) => {
  console.log("a user connected" + socket.id);

  socket.on("leave_room", (data) => {
    let roomPacket = {
      origin: "MasterServer",
      time: getTime(),
      user: "🖥 Server",
      message: data.user + " has left " + data.room + " 😿",
      room: data.room,
    };
    socket.to(roomPacket.room).emit("chat message", roomPacket);

    if (!socket.rooms.has(data.room)) return;

    console.log(`${socket.id} has left room ${data.room}`);

    socket.leave(data.room);

    const arr = Array.from(io.sockets.adapter.rooms);
    const filtered = arr.filter((room) => !room[1].has(room[0]));
    const res = filtered.map((i) => i[0]);
    if (res[0] === "nyanRoom") {
      nyanRoomBusy = "yes";
    } else {
      nyanRoomBusy = "no";
    }
    if (res[0] === "dogeRoom") {
      dogeRoomBusy = "yes";
    } else {
      dogeRoomBusy = "no";
    }
    if (res[0] === "pusheenRoom") {
      pusheenRoomBusy = "yes";
    } else {
      pusheenRoomBusy = "no";
    }

    console.log(model.checkForMessagesUser(data.user));
    if (model.checkForMessagesUser(data.user) == 0) return;

    model.deleteMessages(data.user);
  });

  socket.on("join_room", (data) => {
    if (socket.rooms.has(data.room)) {
      console.log(`${socket.id} has already joined ${data.room}`);
    } else {
      console.log(`${socket.id} has joined ${data.room}`);

      let roomPacket = {
        origin: "MasterServer",
        time: getTime(),
        user: "🖥 Server",
        message: data.user + " has joined " + data.room + " 😻",
        room: data.room,
      };
      //socket.to(roomPacket.room).emit("chat message", roomPacket);
      
/*       model.roomUsers.push({
        room:data.room,
        user:data.user
      }) */
      

      console.log(model.roomUsers)

      
    /*   socket.to(data.room).emit("user join", {
        origin: "MasterServer",
        time: getTime(),
        user: "🖥 Server",
        message: data.user,
        room: data.room,
      }); */

      //socket.to(data.room).emit("user join", model.roomUsers)

      socket.join(data.room);
      model.roomUsersFunc(data.room, data.user)
      socket.to(data.room).emit("user join", model.roomUsers)

      const arr = Array.from(io.sockets.adapter.rooms);
      const filtered = arr.filter((room) => !room[1].has(room[0]));
      const res = filtered.map((i) => i[0]);
      if (res[0] === "nyanRoom") {
        nyanRoomBusy = "yes";
      } else {
        nyanRoomBusy = "no";
      }
      if (res[0] === "dogeRoom") {
        dogeRoomBusy = "yes";
      } else {
        dogeRoomBusy = "no";
      }
      if (res[0] === "pusheenRoom") {
        pusheenRoomBusy = "yes";
      } else {
        pusheenRoomBusy = "no";
      }

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

      //socket.to(data.room).emit("user join", model.roomUsers)

      function filterMessageData() {
        //socket.to(data.room).emit("user join", model.roomUsers)
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
    const arr = Array.from(io.sockets.adapter.rooms);
    const filtered = arr.filter((room) => !room[1].has(room[0]));
    const res = filtered.map((i) => i[0]);
    if (res[0] === "nyanRoom") {
      nyanRoomBusy = "yes";
    } else {
      nyanRoomBusy = "no";
    }
    if (res[0] === "dogeRoom") {
      dogeRoomBusy = "yes";
    } else {
      dogeRoomBusy = "no";
    }
    if (res[0] === "pusheenRoom") {
      pusheenRoomBusy = "yes";
    } else {
      pusheenRoomBusy = "no";
    }
  });

  socket.on("chat message", (msg) => {
    let packet = {
      user: msg.user,
      message: encrypt(msg.message),
      room: msg.room,
    };
    let roomPacket = {
      origin: "server",
      time: getTime(),
      user: msg.user,
      message: msg.message,
      room: msg.room,
    };
    let senderPacket = {
      origin: "sender",
      time: getTime(),
      user: msg.user,
      message: msg.message,
      room: msg.room,
    };
    socket.to(msg.room).emit("chat message", roomPacket);
    socket.emit("chat message", senderPacket); //sending to sender-client only
    model.insertMessage(
      packet.user,
      packet.message.content,
      packet.message.iv,
      packet.room
    );
  });

  socket.on("typing", (data) => {
    if (data.typing == true) {
      socket.to(data.room).emit("display", data);
    } else {
      socket.to(data.room).emit("display", data);
    }
  });
});
http.listen(8080, () => {
  console.log("Server listening on localhost:8080");
});
