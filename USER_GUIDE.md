# Minimax Prompt Builder — Quick Guide

This app helps you build MiniMax H3 "full-reference" video prompts without
hand-typing labels like `<Subject 1>` or `(S1)` over and over. You fill in
boxes and click buttons; the app assembles the final prompt text for you.

## 1. Starting it up

- Double-click **`run.bat`** (after running `install.bat` once, the first time).
- A terminal window opens — leave it open, it's running the app.
- Your browser opens automatically to the app.

## 2. The basic flow

Work through the app roughly top-to-bottom, left-to-right:

### Step 1 — Add your references (left panel)
Click **+ Subject**, **+ Picture**, **+ Video**, or **+ Audio** for every
person, object, scene, image, or audio clip you'll refer to.

- **Subject** = anything that should look/act consistent in the video (a
  person, prop, environment, style, etc.)
- **Picture** = an image used as a literal frame anchor (first frame, last
  frame, keyframe)
- **Video** = a whole reference video you're editing, continuing, or copying
  the structure of
- **Audio** = a sound/voice/music clip being reused or referenced

Each card you add gets a colored chip you can click to insert its label
(like `<Subject 1>`) anywhere else in the app — you never have to type it
by hand.

### Step 2 — Task & Summary
Tick which task types apply (e.g. "reference generation", "video editing") —
this builds the `[...]` prefix automatically. Then write a one-paragraph
plain-English summary of what the video shows.

### Step 3 — Retention Analysis
The app auto-generates one row per reference you added. For each, pick how
it's preserved (e.g. `fully_preserved`, `partially_preserved`) and briefly
note what's kept or changed.

### Step 4 — Detailed Description
This is the main part — shot by shot description of the video:
- Write 1–2 sentences setting the overall style first.
- Click **+ Shot** to add each shot. Shot 1 has no timestamp; later shots
  do.
- Each shot has quick buttons for dialogue (`<d>...</d>`), scene
  transitions, cutoffs, and `[unclear]` speech, plus chips to drop in your
  reference/speaker labels.

### Step 5 — Soundscape & Music
Describe background ambience (traffic, wind, room tone) and any
audience-only score.

### Step 6 — Compile
Click **Compile ▸** (top right). The app assembles everything into the
final formatted prompt, flags anything left unfinished, and gives you
**Copy** and **Download** buttons.

## 3. Saving your work

- Your work **autosaves in the browser** as you type, so a refresh won't
  lose it.
- Use **Save** / **Open…** in the top bar to store named projects as files
  you can come back to later or move to another computer.
- **New** starts a blank project. **Load Sample** fills in a short worked
  example if you want to see the format before writing your own.

## 4. Tips

- Hover or click the small **i** buttons throughout the app for
  explanations of any field or option.
- Only create a Picture/Video card if that specific frame or footage
  matters — if an image is just there to show what a character looks like,
  describe it inside that character's Subject card instead.
- Aim for roughly 350–500 words in the Detailed Description for a
  generation task (editing tasks can run longer, matching the source
  video).
