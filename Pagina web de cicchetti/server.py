from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import csv
import json
import sqlite3
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "reservas.db"
HOST = "127.0.0.1"
PORT = 8080


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS reservations (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                guests INTEGER NOT NULL CHECK (guests BETWEEN 1 AND 8),
                area TEXT NOT NULL,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT NOT NULL,
                notes TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_reservations_date_time ON reservations(date, time)"
        )


def reservation_from_row(row):
    return {
        "id": row["id"],
        "date": row["date"],
        "time": row["time"],
        "guests": row["guests"],
        "area": row["area"],
        "name": row["name"],
        "phone": row["phone"],
        "email": row["email"],
        "notes": row["notes"] or "",
        "createdAt": row["created_at"],
    }


class CicchettiHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.write_json({"ok": True, "database": DB_PATH.name})
            return
        if parsed.path == "/api/reservations":
            self.handle_list_reservations(parsed.query)
            return
        if parsed.path == "/api/reservations.csv":
            self.handle_export_csv()
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/reservations":
            self.handle_create_reservation()
            return
        self.send_error(404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/reservations/"):
            reservation_id = parsed.path.rsplit("/", 1)[-1]
            self.handle_delete_reservation(reservation_id)
            return
        self.send_error(404)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        body = self.rfile.read(length).decode("utf-8")
        return json.loads(body)

    def write_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_list_reservations(self, query_string):
        filters = parse_qs(query_string)
        date_filter = filters.get("date", [""])[0]

        sql = "SELECT * FROM reservations"
        params = []
        if date_filter:
            sql += " WHERE date = ?"
            params.append(date_filter)
        sql += " ORDER BY date, time, created_at"

        with get_connection() as connection:
            rows = connection.execute(sql, params).fetchall()

        self.write_json([reservation_from_row(row) for row in rows])

    def handle_create_reservation(self):
        try:
            payload = self.read_json()
            required = ["id", "date", "time", "guests", "area", "name", "phone", "email"]
            missing = [field for field in required if not payload.get(field)]
            if missing:
                self.write_json({"error": f"Faltan datos: {', '.join(missing)}"}, 400)
                return

            with get_connection() as connection:
                connection.execute(
                    """
                    INSERT INTO reservations
                    (id, date, time, guests, area, name, phone, email, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        payload["id"],
                        payload["date"],
                        payload["time"],
                        int(payload["guests"]),
                        payload["area"],
                        payload["name"].strip(),
                        payload["phone"].strip(),
                        payload["email"].strip(),
                        payload.get("notes", "").strip(),
                        payload.get("createdAt"),
                    ),
                )
            self.write_json(payload, 201)
        except sqlite3.IntegrityError as error:
            self.write_json({"error": str(error)}, 400)
        except (ValueError, json.JSONDecodeError):
            self.write_json({"error": "La reserva no tiene un formato válido."}, 400)

    def handle_delete_reservation(self, reservation_id):
        with get_connection() as connection:
            cursor = connection.execute("DELETE FROM reservations WHERE id = ?", (reservation_id,))
        if cursor.rowcount == 0:
            self.write_json({"error": "Reserva no encontrada."}, 404)
            return
        self.write_json({"ok": True})

    def handle_export_csv(self):
        with get_connection() as connection:
            rows = connection.execute("SELECT * FROM reservations ORDER BY date, time").fetchall()

        csv_path = ROOT / "reservas-export.csv"
        with csv_path.open("w", newline="", encoding="utf-8-sig") as file:
            writer = csv.writer(file)
            writer.writerow(["fecha", "hora", "nombre", "personas", "sector", "telefono", "email", "comentarios"])
            for row in rows:
                writer.writerow(
                    [
                        row["date"],
                        row["time"],
                        row["name"],
                        row["guests"],
                        row["area"],
                        row["phone"],
                        row["email"],
                        row["notes"] or "",
                    ]
                )

        body = csv_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", 'attachment; filename="reservas-cicchetti.csv"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), CicchettiHandler)
    print(f"Cicchetti reservas: http://{HOST}:{PORT}")
    print(f"Base de datos: {DB_PATH}")
    server.serve_forever()
