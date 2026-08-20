# Minimax Prompt Builder

> ⚠️ **Beta** — actively in development, expect rough edges.

A local, offline tool for building MiniMax H3-style full-reference video
prompts — without hand-typing `<Subject 1>`, `<Picture 2>`, `(S1)`, etc.
every time.

## Setup (one time)

1. Put this whole folder anywhere (Desktop, Documents — anywhere).
2. Make sure you have **Python 3.10+** installed. Check with:
   ```
   python --version
   ```
   If you don't have it, get it from
   https://www.python.org/downloads/ — check **"Add python.exe to PATH"**
   during install.
3. Double-click **`install.bat`**.
   - This finds your Python install, creates a local `venv\` folder right
     next to the app, and installs Flask into it. Nothing is installed
     system-wide, and nothing leaves your machine.

## Running it

Double-click **`run.bat`**. A terminal window opens (keep it open — that's
the local server) and your browser opens automatically to the app at
`http://127.0.0.1:5057`.

If that port is already in use, close whatever else is using it, or edit
the port number in `run.bat` and reopen the browser to match.

To stop the app, close the terminal window.

## Quick start

1. Run `run.bat` — your browser opens to the app.
2. Click **Load Sample** (top bar) to see a filled-in example.
3. Click **+ Subject** to add your first reference.
4. Fill in Summary → Detailed Description → click **Compile**.
5. Click **Copy** to grab your finished prompt.

## Using the app

See **[USER_GUIDE.md](USER_GUIDE.md)** for a full walkthrough of the
workflow, each panel, and tips for getting good output.

Your work autosaves in the browser as you type. Use **Save** / **Open…** in
the top bar to keep named projects as JSON files in the `projects\` folder,
so you can come back to them later or move them to another machine.

## License

No license set yet — all rights reserved by default. Add a `LICENSE` file
if you plan to share this repo publicly.
