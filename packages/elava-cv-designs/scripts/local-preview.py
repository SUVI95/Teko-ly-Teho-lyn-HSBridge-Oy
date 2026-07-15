#!/usr/bin/env python3
"""Lightweight local preview — no Node required. Serves modules + mocks AI API."""
import json
import os
import re
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get("PORT", "3000"))


def mock_claude(body: dict) -> str:
    user = ""
    for msg in body.get("messages") or []:
        if msg.get("role") == "user":
            user += msg.get("content") or ""
    system = body.get("system") or ""

    if "KYSYMYS1:" in system or "KYSYMYS1" in system:
        topic = "aiheestasi"
        m = re.search(r"Aihe:\s*(.+)", user)
        if m:
            topic = m.group(1).strip()[:60]
        return (
            "KYSYMYS1: Kerro yksi konkreettinen tarina tai tilanne joka liittyy aiheeseen — "
            "mitä tapahtui ja mikä muuttui?\n"
            "KYSYMYS2: Kuka katsoo tätä esitystä ja mitä heidän pitäisi tehdä sen jälkeen?\n"
            f"KYSYMYS3: Mikä on yksi fakta tai numero joka tekee sinusta uskottavan puhujan aiheesta «{topic}»?"
        )

    return (
        "Luo ammattimainen Gamma-esitys suomeksi. Teema: tumma, moderni, 16:9, Generate mode.\n\n"
        "Väripaletti: #1a1a2e, #6b46c1, #2563a8\n"
        "Fontit: DM Sans body, serif-otsikot\n\n"
        "Dia 1 — Otsikko: [aihe isolla]\n"
        "Sisältö: Yksi vahva koukku lause.\n"
        "Layout: full-bleed photo\n"
        "[KUVA: professional presenter on stage, dark moody lighting, cinematic, high quality]\n\n"
        "Dia 2 — Ongelma\n"
        "Sisältö: Konkreettinen tilanne ennen ratkaisua (3 bulletia).\n"
        "Layout: two columns\n"
        "[KUVA: frustrated person at desk, natural light, documentary style]\n\n"
        "Dia 3 — Ratkaisu\n"
        "Sisältö: Miten asia ratkeaa — 3 numeroitua vaihetta.\n"
        "Layout: icon row\n"
        "[KUVA: clean process diagram style, minimal icons, purple accent]\n\n"
        "(Preview-moodi: asenna Node + OPENAI_API_KEY tuotantotason prompteille.)\n\n"
        "Lähdetiedot:\n" + user[:800]
    )


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("[preview] " + (fmt % args) + "\n")

    def send_json(self, code: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path

        m = re.match(r"^/module/([^/]+)/?$", path)
        if m:
            module_id = m.group(1)
            html_path = os.path.join(ROOT, f"{module_id}.html")
            if os.path.isfile(html_path):
                with open(html_path, "r", encoding="utf-8") as f:
                    html = f.read()
                body = html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

        if path.startswith("/js/"):
            rel = path.lstrip("/")
            js_path = os.path.join(ROOT, "public", rel)
            if os.path.isfile(js_path):
                with open(js_path, "rb") as f:
                    body = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/javascript")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

        # Match Express static("public") — files at site root live under public/
        if path and path != "/":
            rel = path.lstrip("/")
            pub_path = os.path.join(ROOT, "public", rel)
            if os.path.isfile(pub_path):
                ctype = "application/octet-stream"
                if rel.endswith(".html"):
                    ctype = "text/html; charset=utf-8"
                elif rel.endswith(".js"):
                    ctype = "application/javascript"
                elif rel.endswith(".css"):
                    ctype = "text/css"
                with open(pub_path, "rb") as f:
                    body = f.read()
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

        if path in ("/", "/index.html"):
            idx = os.path.join(ROOT, "public", "index.html")
            if os.path.isfile(idx):
                self.path = "/public/index.html"
                return SimpleHTTPRequestHandler.do_GET(self)

        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            body = {}

        if path in ("/api/ai/claude", "/api/ai/chat"):
            text = mock_claude(body)
            return self.send_json(200, {"text": text, "reply": text})

        if path.startswith("/api/reflections/"):
            return self.send_json(200, {"content": "", "data": {}})

        if path.startswith("/api/"):
            return self.send_json(200, {"ok": True})

        self.send_json(404, {"error": "Not found in preview mode"})


def main():
    os.chdir(ROOT)
    server = HTTPServer(("127.0.0.1", PORT), PreviewHandler)
    base = f"http://127.0.0.1:{PORT}"
    print(f"Elävä CV — Veyssette editor (demo): {base}/module/moduuli-elava-cv-veyssette?demo=1")
    print(f"Veyssette mock (4 kokemusta + kuvat): {base}/portfolio-veyssette-mock.html")
    print(f"Mock → editori: {base}/portfolio-veyssette-mock-seed.html")
    print(f"Rekrytoijan näkymä (julkaise editorista): {base}/portfolio-veyssette-local.html")
    print(f"Gamma Studio: {base}/module/moduuli-esitykset-tarjoukset-viestinta")
    print("AI responses are mocked — install Node for real OpenAI/Claude.")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()
