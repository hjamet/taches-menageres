#!/usr/bin/env python3
"""
Tests unitaires et d'intégration pour server.py.
Vérifie les endpoints REST avec une base SQLite isolée.
"""

import os
import sys
import json
import unittest
import tempfile
import threading
from urllib.request import urlopen, Request
from urllib.error import HTTPError

# Importer les éléments du serveur
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import server


class TestServerEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Création d'une base de données temporaire isolée
        cls.test_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        cls.test_db_path = os.path.join(cls.test_dir.name, "test_chores.db")

        # Remplacer DB_PATH dans le module server
        server.DB_PATH = cls.test_db_path
        server.init_db(cls.test_db_path)

        # Port dédié pour les tests
        cls.port = 8769
        server.PORT = cls.port
        server.HOST = "127.0.0.1"

        cls.httpd = server.HTTPServer((server.HOST, server.PORT), server.ChoresRequestHandler)
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.server_thread.join(timeout=1)
        cls.test_dir.cleanup()

    def test_01_health_check(self):
        url = f"http://127.0.0.1:{self.port}/api/health"
        with urlopen(url) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode("utf-8"))
            self.assertEqual(data.get("status"), "ok")
            self.assertEqual(data.get("app"), "taches-menageres")

    def test_02_post_and_get_sessions(self):
        url = f"http://127.0.0.1:{self.port}/api/sessions"

        # Base initialement vide
        with urlopen(url) as response:
            self.assertEqual(response.status, 200)
            sessions = json.loads(response.read().decode("utf-8"))
            self.assertEqual(len(sessions), 0)

        # Insertion d'une session de test
        payload = [
            {
                "id": "test_ses_01",
                "person": "Henri",
                "startIso": "2026-10-29T10:00:00.000Z",
                "endIso": "2026-10-29T10:30:00.000Z",
                "durationSeconds": 1800,
                "rooms": ["Cuisine"],
                "tags": ["Cuisine > Vaisselle"],
                "note": "Session de test unitaire",
            }
        ]

        req = Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(req) as response:
            self.assertEqual(response.status, 200)
            result = json.loads(response.read().decode("utf-8"))
            self.assertEqual(result.get("status"), "ok")
            self.assertEqual(result.get("saved_count"), 1)

        # Vérification GET
        with urlopen(url) as response:
            self.assertEqual(response.status, 200)
            sessions = json.loads(response.read().decode("utf-8"))
            self.assertEqual(len(sessions), 1)
            self.assertEqual(sessions[0]["id"], "test_ses_01")
            self.assertEqual(sessions[0]["person"], "Henri")
            self.assertEqual(sessions[0]["durationSeconds"], 1800)

    def test_03_export_csv(self):
        url = f"http://127.0.0.1:{self.port}/api/export.csv"
        with urlopen(url) as response:
            self.assertEqual(response.status, 200)
            self.assertIn("text/csv", response.headers.get("Content-Type", ""))
            content = response.read().decode("utf-8")
            self.assertTrue(content.startswith("\ufeff"), "Le CSV doit comporter le BOM UTF-8")
            self.assertIn("test_ses_01", content)
            self.assertIn("Henri", content)
            self.assertIn("Cuisine > Vaisselle", content)

    def test_04_delete_session(self):
        url = f"http://127.0.0.1:{self.port}/api/sessions/test_ses_01"
        req = Request(url, method="DELETE")
        with urlopen(req) as response:
            self.assertEqual(response.status, 200)
            result = json.loads(response.read().decode("utf-8"))
            self.assertEqual(result.get("status"), "ok")
            self.assertEqual(result.get("deleted_count"), 1)

        # Vérification qu'il n'y a plus de session
        get_url = f"http://127.0.0.1:{self.port}/api/sessions"
        with urlopen(get_url) as response:
            sessions = json.loads(response.read().decode("utf-8"))
            self.assertEqual(len(sessions), 0)


if __name__ == "__main__":
    unittest.main()
