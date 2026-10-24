PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 phone TEXT NOT NULL, password_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('seeker','owner','admin')),
 approved INTEGER NOT NULL DEFAULT 0 CHECK(approved IN (0,1)),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
 token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
 csrf TEXT NOT NULL, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS owner_requests (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), message TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 note TEXT NOT NULL DEFAULT '', reviewed_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_request ON owner_requests(user_id) WHERE status='pending';
CREATE TABLE IF NOT EXISTS listings (
 id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL,
 description TEXT NOT NULL, address TEXT NOT NULL, district TEXT NOT NULL, city TEXT NOT NULL,
 price INTEGER NOT NULL CHECK(price>0), area REAL NOT NULL CHECK(area>0), deposit INTEGER NOT NULL CHECK(deposit>=0),
 electricity INTEGER NOT NULL CHECK(electricity>=0), water INTEGER NOT NULL CHECK(water>=0),
 amenities TEXT NOT NULL DEFAULT '[]', images TEXT NOT NULL DEFAULT '[]',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected','hidden')),
 occupancy TEXT NOT NULL DEFAULT 'available' CHECK(occupancy IN ('available','rented')),
 review_note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS public_search ON listings(status,city,district,price);
CREATE TABLE IF NOT EXISTS favorites (
 user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id,listing_id)
);
CREATE TABLE IF NOT EXISTS inquiries (
 id INTEGER PRIMARY KEY, listing_id INTEGER NOT NULL REFERENCES listings(id), user_id INTEGER NOT NULL REFERENCES users(id),
 message TEXT NOT NULL, visit_at TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new'
 CHECK(status IN ('new','confirmed','closed')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS leases (
 id INTEGER PRIMARY KEY, listing_id INTEGER NOT NULL REFERENCES listings(id), tenant_name TEXT NOT NULL,
 tenant_phone TEXT NOT NULL, tenant_email TEXT NOT NULL DEFAULT '', tenant_user_id INTEGER REFERENCES users(id), start_date TEXT NOT NULL, end_date TEXT NOT NULL,
 rent INTEGER NOT NULL CHECK(rent>0), deposit INTEGER NOT NULL CHECK(deposit>=0),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','ended')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(end_date>start_date)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_lease ON leases(listing_id) WHERE status='active';
CREATE TABLE IF NOT EXISTS invoices (
 id INTEGER PRIMARY KEY, lease_id INTEGER NOT NULL REFERENCES leases(id), month TEXT NOT NULL,
 rent INTEGER NOT NULL CHECK(rent>=0), electricity_usage REAL NOT NULL CHECK(electricity_usage>=0),
 electricity_rate INTEGER NOT NULL CHECK(electricity_rate>=0), water_usage REAL NOT NULL CHECK(water_usage>=0),
 water_rate INTEGER NOT NULL CHECK(water_rate>=0), service_fee INTEGER NOT NULL CHECK(service_fee>=0),
 total INTEGER NOT NULL CHECK(total>=0), status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid','paid')),
 paid_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(lease_id,month)
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id INTEGER PRIMARY KEY, actor_id INTEGER REFERENCES users(id), action TEXT NOT NULL,
 target TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
