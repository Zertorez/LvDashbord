const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('user_turnover.db');

db.serialize(() => {
  db.all(`SELECT * FROM user_turnover`, (err, rows) => {
    if (err) {
      console.error(err.message);
      return;
    }

    fs.writeFileSync('user_turnover.json', JSON.stringify(rows, null, 2), 'utf-8');
    console.log('Data has been exported to user_turnover.json');
  });
});

db.close();
