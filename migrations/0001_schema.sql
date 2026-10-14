PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Тайгын Түүх',
  synopsis TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  preview_text TEXT NOT NULL,
  continuation_text TEXT NOT NULL,
  price_mnt INTEGER NOT NULL DEFAULT 1500 CHECK(price_mnt >= 0),
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  story_id TEXT NOT NULL REFERENCES stories(id),
  amount_mnt INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PAID','FAILED','CANCELLED')),
  qpay_invoice_id TEXT,
  qpay_sender_invoice_no TEXT NOT NULL UNIQUE,
  qpay_payment_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  UNIQUE(user_id, story_id, id)
);
CREATE TABLE IF NOT EXISTS unlocks (
  user_id TEXT NOT NULL REFERENCES users(id),
  story_id TEXT NOT NULL REFERENCES stories(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(user_id, story_id)
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_published ON stories(published, created_at DESC);
