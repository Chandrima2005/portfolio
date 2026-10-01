"""Build index.html from the section files.

Edit the files in src/ (sections, partials or layout), then run:

    python build.py

It replaces every <!-- include: path --> line in src/layout.html with the
contents of src/path and writes the result to index.html.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
PATTERN = re.compile(r"<!-- include: ([\w./-]+) -->")

def expand(text, seen=()):
    def repl(match):
        rel = match.group(1)
        path = SRC / rel
        if not path.exists():
            sys.exit(f"Missing include: src/{rel}")
        if rel in seen:
            sys.exit(f"Include loop at src/{rel}")
        return expand(path.read_text(encoding="utf-8"), seen + (rel,)).rstrip("\n")
    return PATTERN.sub(repl, text)

html = expand((SRC / "layout.html").read_text(encoding="utf-8"))
(ROOT / "index.html").write_text(html, encoding="utf-8")
print(f"Built index.html ({len(html) // 1024} KB)")
