"""Local preview server that behaves like the live site.

    python serve.py          (then open http://localhost:8000)

Clean paths such as /projects or /projects/gradient-atlas are not files, so
they are answered with index.html, the same way vercel.json does it online.
"""
import http.server, pathlib, sys

ROOT = pathlib.Path(__file__).parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def send_head(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        if not (ROOT / path.lstrip("/")).exists():
            self.path = "/index.html"
        return super().send_head()

    def end_headers(self):
        # never let the browser keep an old copy, so an edit always shows on reload
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

http.server.ThreadingHTTPServer(("", PORT), Handler).serve_forever()
