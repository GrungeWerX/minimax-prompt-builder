"""
Minimax Prompt Builder
======================
A small local web app for building MiniMax H3 style, full-reference video
prompts (subject_definitions / summary / retention_analysis /
detailed_description / overall_soundscape / non_diegetic_music) without
having to hand-type reference labels every time.

Run it with `run.bat` (Windows) after `install.bat` has set up the venv.
This file only handles: serving the UI, saving/loading projects as JSON on
disk, and exporting the compiled prompt as a .txt file. All of the actual
prompt-building logic lives in the browser (static/js/app.js); the rules
and label/help text it displays come from reference_data.py.
"""

import json
import re
import threading
import webbrowser
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_from_directory
from werkzeug.utils import secure_filename

import reference_data as rd

BASE_DIR = Path(__file__).resolve().parent
PROJECTS_DIR = BASE_DIR / "projects"
PROJECTS_DIR.mkdir(exist_ok=True)

app = Flask(__name__)


def _safe_name(name: str) -> str:
    """Turn a project title into a filesystem-safe filename (no extension)."""
    name = (name or "Untitled Prompt").strip()
    name = secure_filename(name) or "Untitled_Prompt"
    return name


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/reference-data")
def reference_data():
    """One JSON payload the front end uses to render labels, task types,
    relationship markers, and every info-popup's help text."""
    return jsonify(
        {
            "referenceTypes": rd.REFERENCE_TYPES,
            "taskTypes": rd.TASK_TYPES,
            "taskTypeHelp": rd.TASK_TYPE_HELP,
            "visualMarkers": rd.VISUAL_MARKERS,
            "audioMarkers": rd.AUDIO_MARKERS,
            "quickTags": rd.QUICK_TAGS,
            "sectionHelp": rd.SECTION_HELP,
            "sharedBasicsHelp": rd.SHARED_BASICS_HELP,
        }
    )


@app.route("/api/projects")
def list_projects():
    items = []
    for f in sorted(PROJECTS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            items.append(
                {
                    "file": f.stem,
                    "name": data.get("projectName", f.stem),
                    "updated": datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M"),
                }
            )
        except (json.JSONDecodeError, OSError):
            continue
    return jsonify(items)


@app.route("/api/projects/<name>", methods=["GET"])
def load_project(name):
    path = PROJECTS_DIR / f"{_safe_name(name)}.json"
    if not path.exists():
        return jsonify({"error": "not found"}), 404
    return jsonify(json.loads(path.read_text(encoding="utf-8")))


@app.route("/api/projects", methods=["POST"])
def save_project():
    payload = request.get_json(force=True, silent=True) or {}
    name = _safe_name(payload.get("projectName"))
    path = PROJECTS_DIR / f"{name}.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return jsonify({"ok": True, "file": name})


@app.route("/api/projects/<name>", methods=["DELETE"])
def delete_project(name):
    path = PROJECTS_DIR / f"{_safe_name(name)}.json"
    if path.exists():
        path.unlink()
    return jsonify({"ok": True})


@app.route("/api/word-count", methods=["POST"])
def word_count():
    """Small helper so the front end's live word counter matches Python's
    definition of a 'word' exactly (kept server-side so it's easy to tweak)."""
    text = (request.get_json(force=True, silent=True) or {}).get("text", "")
    words = re.findall(r"\S+", text)
    return jsonify({"count": len(words)})


def _open_browser():
    webbrowser.open("http://127.0.0.1:5057")


if __name__ == "__main__":
    threading.Timer(1.0, _open_browser).start()
    app.run(host="127.0.0.1", port=5057, debug=False)
