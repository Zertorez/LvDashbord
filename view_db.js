const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('user_turnover.db');

db.serialize(() => {
  db.all(`SELECT * FROM user_turnover`, (err, rows) => {
    if (err) {
      console.error(err.message);
      return;
    }
    console.log(rows);
  });
});

db.close();
