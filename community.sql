CREATE TABLE IF NOT EXISTS reviews (
 id INTEGER PRIMARY KEY, lease_id INTEGER NOT NULL UNIQUE REFERENCES leases(id),
 user_id INTEGER NOT NULL REFERENCES users(id), listing_id INTEGER NOT NULL REFERENCES listings(id),
 owner_id INTEGER NOT NULL REFERENCES users(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 20 AND 2000),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected','hidden')),
 note TEXT NOT NULL DEFAULT '', reviewed_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS public_owner_reviews ON reviews(owner_id,status,id);
CREATE TABLE IF NOT EXISTS listing_reports (
 id INTEGER PRIMARY KEY, listing_id INTEGER NOT NULL REFERENCES listings(id), user_id INTEGER NOT NULL REFERENCES users(id),
 reason TEXT NOT NULL CHECK(reason IN ('wrong_info','scam','unavailable','inappropriate')),
 detail TEXT NOT NULL CHECK(length(detail) BETWEEN 20 AND 2000),
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','dismissed')),
 note TEXT NOT NULL DEFAULT '', reviewed_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_report ON listing_reports(listing_id,user_id) WHERE status='open';
