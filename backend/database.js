const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'todo.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      mfa_enabled INTEGER DEFAULT 0,
      otp_secret TEXT,
      reset_token TEXT,
      reset_token_expires_at DATETIME,
      subscription_status TEXT DEFAULT 'free',
      subscription_reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add legacy columns for older databases
  db.run('ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 0', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Failed to add mfa_enabled column:', err.message);
    }
  });
  db.run('ALTER TABLE users ADD COLUMN otp_secret TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Failed to add otp_secret column:', err.message);
    }
  });
  db.run('ALTER TABLE users ADD COLUMN reset_token TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Failed to add reset_token column:', err.message);
    }
  });
  db.run('ALTER TABLE users ADD COLUMN reset_token_expires_at DATETIME', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Failed to add reset_token_expires_at column:', err.message);
    }
  });
  db.run('ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT "free"', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Failed to add subscription_status column:', err.message);
    }
  });
  db.run('ALTER TABLE users ADD COLUMN subscription_reference TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Failed to add subscription_reference column:', err.message);
    }
  });

  // Todos table
  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      due_date TEXT,
      priority TEXT DEFAULT 'Medium',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  db.run('ALTER TABLE todos ADD COLUMN due_date TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Failed to add due_date column:', err.message);
    }
  });
  db.run('ALTER TABLE todos ADD COLUMN priority TEXT DEFAULT "Medium"', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Failed to add priority column:', err.message);
    }
  });
});

module.exports = db;
