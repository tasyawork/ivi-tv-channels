import http.server
import socketserver
import os

DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 5180


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def end_headers(self):
        # Дев-прототип: всегда отдаём свежие файлы (без кэша браузера)
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"serving {DIR} at http://127.0.0.1:{PORT}")
    httpd.serve_forever()
