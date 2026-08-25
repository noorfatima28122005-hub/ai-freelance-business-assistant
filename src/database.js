const Database = require("better-sqlite3");

const db = new Database("freelance_assistant.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    project TEXT,
    deadline TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;