const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('user_turnover.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS user_turnover (
    user_id INTEGER,
    date TEXT,
    turnover REAL NOT NULL,
    PRIMARY KEY (user_id, date)
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS user_photos (
    user_id INTEGER PRIMARY KEY,
    photo_url TEXT
  )`);
});

db.close();
console.log('Database initialized.');
