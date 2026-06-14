from __future__ import annotations

from pathlib import Path


def main() -> int:
    # Fix for LabelImg 1.8.6 + PyQt5 5.15.11 on Windows:
    # TypeError: setValue(self, a0: int): argument 1 has unexpected type 'float'
    candidate = Path(".venv/Lib/site-packages/labelImg/labelImg.py")
    canvas = Path(".venv/Lib/site-packages/libs/canvas.py")
    if not candidate.exists():
        print("Could not find LabelImg in .venv. Install it with: pip install labelImg")
        return 1

    patched_any = False

    # Patch 1: scroll wheel TypeError in labelImg.py
    text = candidate.read_text(encoding="utf-8")
    needle = "bar.setValue(bar.value() + bar.singleStep() * units)"
    repl = "bar.setValue(int(bar.value() + bar.singleStep() * units))"
    if needle in text and repl not in text:
        candidate.write_text(text.replace(needle, repl), encoding="utf-8")
        print("Patched LabelImg scroll_request() to cast to int.")
        patched_any = True
    else:
        print("LabelImg scroll_request() patch: already applied or not found.")

    # Patch 2: QPointF float drawLine crash in libs/canvas.py
    if canvas.exists():
        ctext = canvas.read_text(encoding="utf-8")
        if "p.drawLine(self.prev_point.x(), 0, self.prev_point.x(), self.pixmap.height())" in ctext:
            ctext = ctext.replace(
                "p.drawLine(self.prev_point.x(), 0, self.prev_point.x(), self.pixmap.height())",
                "x = int(self.prev_point.x())\n            y = int(self.prev_point.y())\n            p.drawLine(x, 0, x, int(self.pixmap.height()))",
            )
            ctext = ctext.replace(
                "p.drawLine(0, self.prev_point.y(), self.pixmap.width(), self.prev_point.y())",
                "p.drawLine(0, y, int(self.pixmap.width()), y)",
            )
            canvas.write_text(ctext, encoding="utf-8")
            print("Patched libs/canvas.py drawLine() to cast to int.")
            patched_any = True
        else:
            print("libs/canvas.py drawLine() patch: already applied or not found.")
    else:
        print("Could not find libs/canvas.py; skipping that patch.")

    if not patched_any:
        print("No changes applied.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
