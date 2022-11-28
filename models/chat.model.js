const con = require("../mysql/db.mysql");

function insertMessage(user, messagecontent, messageiv, room) {
  let sql = `INSERT INTO msgtable (user, messagecontent, messageiv, room) VALUES ("${user}", "${messagecontent}", "${messageiv}", "${room}")`;
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log(`Message from ${user} inserted into the database`);
  });
}

function checkForMessagesUser(user) {
  let sql = `SELECT room FROM msgtable WHERE user = "${user}"`;
  con.query(sql, function (err, result) {
    if (err) {
      console.log(`No messages for ${user} in database`);
      return;
    }
    console.log(result.length);
    return result.length;
  });
}

function deleteMessages(user) {
  let sql = `DELETE FROM msgtable WHERE user = "${user}"`;
  con.query(sql, function (err, result) {
    if (err) throw err;
    if (result) {
      console.log(`Deleted messages for user ${user}`);
    }
  });
}

module.exports = {
  checkForMessagesUser,
  deleteMessages,
  insertMessage,
};
