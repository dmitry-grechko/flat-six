#!/usr/bin/env python3
"""Find workshop-manual Fig titles matching keywords.

Usage:
  python3 .cursor/skills/wm-3d-calibrate/scripts/find-figs.py --gen 981 --keywords crankshaft,camshaft
  python3 .cursor/skills/wm-3d-calibrate/scripts/find-figs.py --gen 981 --text /tmp/wm-981.txt --keywords radiator --start 4000 --end 4300
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def repo_root() -> Path:
    # .../porsche/.cursor/skills/wm-3d-calibrate/scripts/this.py → porsche
    return Path(__file__).resolve().parents[4]


def ensure_text(gen: str, pdf: Path, text_path: Path) -> None:
    if text_path.exists() and text_path.stat().st_size > 1_000_000:
        return
    if not pdf.exists():
        sys.exit(f"PDF missing: {pdf} (copy workshop manual locally first)")
    print(f"Extracting text → {text_path} (slow)…", file=sys.stderr)
    subprocess.run(["pdftotext", "-layout", str(pdf), str(text_path)], check=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--gen", default="981")
    ap.add_argument("--pdf", type=Path, default=None)
    ap.add_argument("--text", type=Path, default=None)
    ap.add_argument("--keywords", required=True, help="Comma-separated, case-insensitive")
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end", type=int, default=0)
    ap.add_argument("--limit", type=int, default=80)
    args = ap.parse_args()

    root = repo_root()
    pdf = args.pdf or root / "public" / "manual" / f"{args.gen}-workshop-manual.pdf"
    text_path = args.text or Path(f"/tmp/wm-{args.gen}.txt")
    ensure_text(args.gen, pdf, text_path)

    pages = text_path.read_text(errors="replace").split("\f")
    end = args.end or len(pages)
    keys = [k.strip().lower() for k in args.keywords.split(",") if k.strip()]

    hits: list[tuple[int, str]] = []
    for i in range(max(0, args.start - 1), min(end, len(pages))):
        page = pages[i]
        for ln in page.splitlines():
            s = ln.strip()
            if not s.startswith("Fig "):
                continue
            low = s.lower()
            if any(k in low for k in keys):
                hits.append((i + 1, s[:140]))
                break

    print(f"# {args.gen} Fig hits for {keys} (pages {args.start}–{end or len(pages)})")
    for p, title in hits[: args.limit]:
        print(f"p{p}: {title}")
    print(f"# total {len(hits)}" + (f" (showing {args.limit})" if len(hits) > args.limit else ""))


if __name__ == "__main__":
    main()
