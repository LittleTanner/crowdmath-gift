CREATE TABLE IF NOT EXISTS codes (
  code TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'free',   -- free | given (shown, held for one browser) | redeemed (tapped Redeem) | bad
  token TEXT,                            -- browser that was given it
  given_at INTEGER
);
CREATE INDEX IF NOT EXISTS codes_status ON codes (status);
CREATE INDEX IF NOT EXISTS codes_token ON codes (token);
CREATE TABLE IF NOT EXISTS ipdays (
  ip TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, day)
);
