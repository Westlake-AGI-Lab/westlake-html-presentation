"""Local workspace accounts. Roles are read from SQLite on every authorization check."""
from contextlib import contextmanager
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import sqlite3
import time

MESSAGE = 'Incorrect ID or password'
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError

HASHER = PasswordHasher()

def password_hash(password):
    return HASHER.hash(password)

DUMMY = password_hash(secrets.token_urlsafe(32))

def verify(password, encoded):
    try:
        return HASHER.verify(encoded, password)
    except VerificationError:
        return False

class Accounts:
    def __init__(self, path):
        self.path = Path(path).expanduser().resolve()
        self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        fd = os.open(self.path, os.O_CREAT | os.O_RDWR, 0o600)
        os.close(fd)
        os.chmod(self.path, 0o600)
        with self.connect() as db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS accounts (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, password_hash TEXT NOT NULL,
                    is_teacher INTEGER NOT NULL DEFAULT 0 CHECK (is_teacher IN (0,1)));
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, expires REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS failures (key TEXT NOT NULL, at REAL NOT NULL);
                CREATE INDEX IF NOT EXISTS failures_key ON failures(key, at);

            ''')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def seed(self, student_password, teacher_password):
        if len(student_password) < 12 or len(teacher_password) < 12:
            raise ValueError('Seed passwords must contain at least 12 characters')
        with self.connect() as db:
            for account_id, name, teacher, password in [
                ('DEMO2026', 'Demo Student', 0, student_password),
                ('202400000', 'Demo Teacher', 1, teacher_password),
                ('20243841001', 'Demo Student One', 0, student_password),
                ('20243841002', 'Demo Student Two', 0, student_password),
                ('20243841003', 'Demo Student Three', 0, student_password)]:
                db.execute('INSERT OR IGNORE INTO accounts VALUES (?,?,?,?)',
                           (account_id, name, password_hash(password), teacher))

    def login(self, account_id, password, address):
        account_id = account_id if isinstance(account_id, str) and len(account_id) <= 40 else ''
        password = password if isinstance(password, str) and len(password) <= 1024 else ''
        keys = [hashlib.sha256((kind + value).encode()).hexdigest()
                for kind, value in [('id:', account_id), ('ip:', address)]]
        now = time.time()
        with self.connect() as db:
            # Serialize check/hash/record so simultaneous failures cannot bypass lockout.
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM failures WHERE at <= ?', (now-900,))
            db.execute('DELETE FROM sessions WHERE expires <= ?', (now,))
            counts = [db.execute('SELECT COUNT(*) FROM failures WHERE key=?', (key,)).fetchone()[0] for key in keys]
            if counts[0] >= 5 or counts[1] >= 20:
                return None
            row = db.execute('SELECT * FROM accounts WHERE id=?', (account_id,)).fetchone()
            valid = verify(password, row['password_hash'] if row else DUMMY)
            if not row or not valid:
                db.executemany('INSERT INTO failures VALUES (?,?)', [(key, now) for key in keys])
                return None
            token = secrets.token_urlsafe(32)
            db.execute('INSERT INTO sessions VALUES (?,?,?)',
                       (hashlib.sha256(token.encode()).hexdigest(), account_id, now+43200))
            return token, self.home(row)

    @staticmethod
    def home(row):
        return '/teacher' if row['is_teacher'] else '/courses'

    def account(self, token):
        with self.connect() as db:
            row = db.execute('SELECT a.* FROM sessions s JOIN accounts a ON a.id=s.account_id '
                             'WHERE token_hash=? AND expires>?',
                             (hashlib.sha256(token.encode()).hexdigest(), time.time())).fetchone()
            return dict(row) if row else None

    def logout(self, token):
        with self.connect() as db:
            db.execute('DELETE FROM sessions WHERE token_hash=?', (hashlib.sha256(token.encode()).hexdigest(),))


def main():
    parser = argparse.ArgumentParser(description='Initialize local workspace demo accounts (idempotent; existing accounts unchanged).')
    parser.add_argument('--db', required=True)
    parser.add_argument('--password-file', required=True, help='Private JSON outside the repository: student_password and teacher_password')
    args = parser.parse_args()
    data = json.loads(Path(args.password_file).read_text())
    Accounts(args.db).seed(data['student_password'], data['teacher_password'])

if __name__ == '__main__':
    main()
