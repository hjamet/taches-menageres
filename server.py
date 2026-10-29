#!/usr/bin/env python3
"""
Serveur HTTP standard Python pour l'application Tâches Ménagères.
Double persistance locale SQLite et service des fichiers statiques web/.
Zéro dépendance externe requise.
"""

import os
import sys
import json
import sqlite3
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get("CHORES_PORT", "8765"))
HOST = os.environ.get("CHORES_HOST", "127.0.0.1")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.environ.get("CHORES_DB_PATH", os.path.join(DATA_DIR, "chores.db"))


def init_db(db_path=None):
    target_path = db_path or DB_PATH
    dir_name = os.path.dirname(target_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    with sqlite3.connect(target_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                person TEXT NOT NULL,
                start_iso TEXT NOT NULL,
                end_iso TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL,
                rooms TEXT NOT NULL,
                tags TEXT NOT NULL,
                note TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )
        conn.commit()


def get_db_connection(db_path=None):
    target_path = db_path or DB_PATH
    conn = sqlite3.connect(target_path)
    conn.row_factory = sqlite3.Row
    return conn


def format_duration_hm(seconds):
    s = max(0, int(seconds or 0))
    hours = s // 3600
    minutes = (s % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def escape_csv_field(val):
    if val is None:
        return ""
    s = str(val)
    if any(c in s for c in (",", '"', "\n", "\r")):
        clean = s.replace('"', '""')
        return f'"{clean}"'
    return s


class ChoresRequestHandler(BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            self.handle_health()
        elif path == "/api/sessions":
            self.handle_get_sessions()
        elif path == "/api/export.csv":
            self.handle_export_csv()
        else:
            self.handle_static(path)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/sessions":
            self.handle_save_sessions()
        else:
            self.send_error(404, "Endpoint non trouvé")

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/sessions/"):
            session_id = path.split("/api/sessions/")[1].strip()
            self.handle_delete_session(session_id)
        else:
            self.send_error(404, "Endpoint non trouvé")

    def handle_health(self):
        payload = {
            "status": "ok",
            "app": "taches-menageres",
            "version": "1.0.0",
            "db": os.path.basename(DB_PATH),
        }
        data = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(data)

    def handle_get_sessions(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, person, start_iso, end_iso, duration_seconds, rooms, tags, note FROM sessions ORDER BY start_iso DESC"
            )
            rows = cursor.fetchall()
            sessions = []
            for r in rows:
                sessions.append(
                    {
                        "id": r["id"],
                        "person": r["person"],
                        "startIso": r["start_iso"],
                        "endIso": r["end_iso"],
                        "durationSeconds": r["duration_seconds"],
                        "rooms": json.loads(r["rooms"]) if r["rooms"] else [],
                        "tags": json.loads(r["tags"]) if r["tags"] else [],
                        "note": r["note"] or "",
                    }
                )
            conn.close()

            data = json.dumps(sessions, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_json_error(500, f"Erreur base de données: {e}")

    def handle_save_sessions(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(length).decode("utf-8")
            body = json.loads(raw_body)
            items = body if isinstance(body, list) else [body]

            conn = get_db_connection()
            cursor = conn.cursor()
            saved_count = 0

            with conn:
                for item in items:
                    if not item or not isinstance(item, dict):
                        continue
                    sid = str(item.get("id") or "")
                    if not sid:
                        continue
                    person = str(item.get("person") or "Henri")
                    start_iso = str(item.get("startIso") or item.get("start_iso") or "")
                    end_iso = str(item.get("endIso") or item.get("end_iso") or start_iso)
                    duration_sec = int(item.get("durationSeconds") or item.get("duration_seconds") or 0)
                    rooms_val = json.dumps(item.get("rooms") or [], ensure_ascii=False)
                    tags_val = json.dumps(item.get("tags") or [], ensure_ascii=False)
                    note = str(item.get("note") or "")

                    cursor.execute(
                        """
                        INSERT INTO sessions (id, person, start_iso, end_iso, duration_seconds, rooms, tags, note)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                            person=excluded.person,
                            start_iso=excluded.start_iso,
                            end_iso=excluded.end_iso,
                            duration_seconds=excluded.duration_seconds,
                            rooms=excluded.rooms,
                            tags=excluded.tags,
                            note=excluded.note
                    """,
                        (sid, person, start_iso, end_iso, duration_sec, rooms_val, tags_val, note),
                    )
                    saved_count += 1

            conn.close()

            resp = {"status": "ok", "saved_count": saved_count}
            data = json.dumps(resp).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_json_error(500, f"Erreur enregistrement session: {e}")

    def handle_delete_session(self, session_id):
        try:
            conn = get_db_connection()
            with conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
                deleted = cursor.rowcount
            conn.close()

            resp = {"status": "ok", "deleted_count": deleted}
            data = json.dumps(resp).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_json_error(500, f"Erreur suppression session: {e}")

    def handle_export_csv(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, person, start_iso, end_iso, duration_seconds, rooms, tags, note FROM sessions ORDER BY start_iso DESC"
            )
            rows = cursor.fetchall()
            conn.close()

            lines = ["id,date,start_time,end_time,duration_seconds,duration_hm,person,rooms,tags,note"]
            for r in rows:
                start_iso = r["start_iso"] or ""
                end_iso = r["end_iso"] or ""
                date_str = start_iso[:10] if len(start_iso) >= 10 else ""
                start_time_str = start_iso[11:16] if len(start_iso) >= 16 else ""
                end_time_str = end_iso[11:16] if len(end_iso) >= 16 else start_time_str
                dur_sec = r["duration_seconds"] or 0
                dur_hm = format_duration_hm(dur_sec)

                try:
                    rooms_list = json.loads(r["rooms"]) if r["rooms"] else []
                except Exception:
                    rooms_list = []
                try:
                    tags_list = json.loads(r["tags"]) if r["tags"] else []
                except Exception:
                    tags_list = []

                rooms_str = "; ".join(rooms_list)
                tags_str = "; ".join(tags_list)

                line = ",".join(
                    [
                        escape_csv_field(r["id"]),
                        escape_csv_field(date_str),
                        escape_csv_field(start_time_str),
                        escape_csv_field(end_time_str),
                        escape_csv_field(dur_sec),
                        escape_csv_field(dur_hm),
                        escape_csv_field(r["person"]),
                        escape_csv_field(rooms_str),
                        escape_csv_field(tags_str),
                        escape_csv_field(r["note"] or ""),
                    ]
                )
                lines.append(line)

            csv_data = ("\ufeff" + "\r\n".join(lines)).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="taches_menageres_export.csv"')
            self.send_header("Content-Length", str(len(csv_data)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(csv_data)
        except Exception as e:
            self.send_json_error(500, f"Erreur export CSV: {e}")

    def handle_static(self, path):
        if path == "/" or path == "":
            path = "/index.html"

        # Sécurité path traversal
        clean_path = os.path.normpath(path.lstrip("/"))
        file_path = os.path.join(WEB_DIR, clean_path)

        if not os.path.commonpath([WEB_DIR, os.path.abspath(file_path)]) == WEB_DIR:
            self.send_error(403, "Accès interdit")
            return

        if not os.path.isfile(file_path):
            # Fallback SPA pour PWA
            file_path = os.path.join(WEB_DIR, "index.html")

        if not os.path.isfile(file_path):
            self.send_error(404, "Fichier non trouvé")
            return

        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            if file_path.endswith(".js") or file_path.endswith(".mjs"):
                mime_type = "application/javascript"
            elif file_path.endswith(".json"):
                mime_type = "application/json"
            else:
                mime_type = "application/octet-stream"

        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", f"{mime_type}; charset=utf-8" if "text" in mime_type or "javascript" in mime_type or "json" in mime_type else mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Erreur lecture fichier: {e}")

    def send_json_error(self, code, message):
        payload = {"status": "error", "error": message}
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        # Réduire la pollution de log
        if "/api/health" in args[0]:
            return
        super().log_message(format, *args)


def run_server():
    init_db()
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, ChoresRequestHandler)
    print(f"Serveur Tâches Ménagères démarré sur http://{HOST}:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du serveur.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
