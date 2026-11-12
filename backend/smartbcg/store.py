import json
import os
import sqlite3
from contextlib import closing, contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

TABLES = ("projects", "reviews", "decisions", "actions", "action_events", "benefits",
          "observations", "scenarios", "study", "legacy")


def now():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


class Store:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path, timeout=10)) as db:
            db.execute("PRAGMA journal_mode=WAL")
        with self.connection(write=True) as db:
            for table in TABLES:
                db.execute(f"""CREATE TABLE IF NOT EXISTS {table} (
                    id TEXT PRIMARY KEY, project TEXT REFERENCES projects(id), data TEXT NOT NULL
                )""")
                db.execute(f"CREATE INDEX IF NOT EXISTS idx_{table}_project ON {table}(project)")

    @contextmanager
    def connection(self, write=False):
        db = sqlite3.connect(self.path, timeout=10)
        db.execute("PRAGMA foreign_keys=ON")
        try:
            db.execute("BEGIN IMMEDIATE" if write else "BEGIN")
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    @classmethod
    def configured(cls):
        return cls(os.getenv("SMARTBCG_DB", "var/smartbcg.sqlite3"))


def records(db, table, project=None):
    query = f"SELECT data FROM {table}"
    if project is None:
        rows = db.execute(query + " ORDER BY rowid DESC")
    else:
        rows = db.execute(query + " WHERE project=? ORDER BY rowid DESC", (project,))
    return [json.loads(row[0]) for row in rows]


def get(db, table, ident):
    row = db.execute(f"SELECT data FROM {table} WHERE id=?", (ident,)).fetchone()
    return json.loads(row[0]) if row else None


def put(db, table, data, *, project=None, ident=None):
    data = {**data, "id": ident or uuid4().hex, "created_at": now()}
    if project:
        data["project_id"] = project
    db.execute(f"INSERT INTO {table}(id, project, data) VALUES (?, ?, ?)",
               (data["id"], project, json.dumps(data, ensure_ascii=False, allow_nan=False)))
    return data


def update(db, table, data):
    data = {**data, "updated_at": now()}
    db.execute(f"UPDATE {table} SET data=? WHERE id=?",
               (json.dumps(data, ensure_ascii=False, allow_nan=False), data["id"]))
    return data
