#!/usr/bin/env python3
"""codes.txt (one offer code per line) -> seed.sql. Re-running is safe: codes already in the database are ignored."""
import re, sys
codes = [c.strip().upper() for c in open(sys.argv[1] if len(sys.argv) > 1 else "codes.txt") if c.strip()]
bad = [c for c in codes if not re.fullmatch(r"[A-Z0-9]{8,20}", c)]
if bad: sys.exit("Odd-looking codes: " + ", ".join(bad[:5]))
codes = list(dict.fromkeys(codes))
with open("seed.sql", "w") as f:
    for c in codes: f.write(f"INSERT OR IGNORE INTO codes (code) VALUES ('{c}');\n")
print(f"{len(codes)} codes -> seed.sql")
