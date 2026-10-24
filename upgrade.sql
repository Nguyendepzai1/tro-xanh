CREATE TABLE IF NOT EXISTS owner_profiles (
 user_id INTEGER PRIMARY KEY REFERENCES users(id), bio TEXT NOT NULL DEFAULT '',
 area TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS verification_files (
 id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), mime TEXT NOT NULL,
 content BLOB NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS owner_verifications (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
 legal_name TEXT NOT NULL, address TEXT NOT NULL, relationship TEXT NOT NULL CHECK(relationship IN ('owner','authorized')),
 evidence_id TEXT NOT NULL REFERENCES verification_files(id), explanation TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 note TEXT NOT NULL DEFAULT '', reviewed_by INTEGER REFERENCES users(id), reviewed_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS pending_verification ON owner_verifications(user_id) WHERE status='pending';
CREATE TABLE IF NOT EXISTS conversations (
 id INTEGER PRIMARY KEY, listing_id INTEGER NOT NULL REFERENCES listings(id),
 seeker_id INTEGER NOT NULL REFERENCES users(id), owner_id INTEGER NOT NULL REFERENCES users(id),
 seeker_read INTEGER NOT NULL DEFAULT 0, owner_read INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(listing_id,seeker_id)
);
CREATE TABLE IF NOT EXISTS messages (
 id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id),
 sender_id INTEGER NOT NULL REFERENCES users(id), body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
 client_key TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(conversation_id,sender_id,client_key)
);
CREATE INDEX IF NOT EXISTS chat_history ON messages(conversation_id,id);
CREATE TABLE IF NOT EXISTS rental_deals (
 id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id),
 listing_id INTEGER NOT NULL REFERENCES listings(id), seeker_id INTEGER NOT NULL REFERENCES users(id),
 owner_id INTEGER NOT NULL REFERENCES users(id), rent INTEGER NOT NULL CHECK(rent>0),
 deposit INTEGER NOT NULL CHECK(deposit>0), terms TEXT NOT NULL, fee_bps INTEGER NOT NULL CHECK(fee_bps BETWEEN 0 AND 10000),
 status TEXT NOT NULL DEFAULT 'offered' CHECK(status IN ('offered','accepted','funded','completed','cancelled','refunded')),
 lease_id INTEGER UNIQUE REFERENCES leases(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at TEXT NOT NULL DEFAULT (datetime('now','+24 hours'))
);
CREATE UNIQUE INDEX IF NOT EXISTS one_reserved_deal ON rental_deals(listing_id) WHERE status IN ('accepted','funded');
CREATE TABLE IF NOT EXISTS payments (
 id INTEGER PRIMARY KEY, payer_id INTEGER NOT NULL REFERENCES users(id), owner_id INTEGER NOT NULL REFERENCES users(id),
 deal_id INTEGER REFERENCES rental_deals(id), invoice_id INTEGER REFERENCES invoices(id),
 kind TEXT NOT NULL CHECK(kind IN ('deposit','rent')), amount INTEGER NOT NULL CHECK(amount>0),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','refunded','cancelled')),
 mode TEXT NOT NULL DEFAULT 'simulation' CHECK(mode='simulation'), reference TEXT NOT NULL UNIQUE,
 note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, paid_at TEXT,
 CHECK((kind='deposit' AND deal_id IS NOT NULL AND invoice_id IS NULL) OR (kind='rent' AND invoice_id IS NOT NULL AND deal_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS live_deposit_payment ON payments(deal_id) WHERE status IN ('pending','paid');
CREATE UNIQUE INDEX IF NOT EXISTS live_invoice_payment ON payments(invoice_id) WHERE status IN ('pending','paid');
CREATE TABLE IF NOT EXISTS commissions (
 id INTEGER PRIMARY KEY, deal_id INTEGER NOT NULL UNIQUE REFERENCES rental_deals(id),
 lease_id INTEGER NOT NULL UNIQUE REFERENCES leases(id), owner_id INTEGER NOT NULL REFERENCES users(id),
 base_rent INTEGER NOT NULL, fee_bps INTEGER NOT NULL, amount INTEGER NOT NULL CHECK(amount>=0),
 status TEXT NOT NULL DEFAULT 'due' CHECK(status IN ('due','paid')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS platform_settings (key TEXT PRIMARY KEY,value INTEGER NOT NULL);
INSERT OR IGNORE INTO platform_settings VALUES('success_fee_bps',500);
