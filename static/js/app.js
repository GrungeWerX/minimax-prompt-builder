/* =========================================================
   Minimax Prompt Builder — app.js
   Vanilla JS, no build step. Talks to the Flask backend only
   for reference-data / save / load / word-count.
   ========================================================= */

(() => {
  "use strict";

  const LS_KEY = "minimax_prompt_builder_state_v1";

  /** Server-provided rule data (task types, markers, help text). */
  let RULES = null;

  /** ---------- App state ---------- */
  let state = freshState();

  function freshState() {
    return {
      projectName: "Untitled Prompt",
      references: [],        // {id, type, num, description}
      speakers: [],          // ["S1","S2",...]
      taskTypes: [],         // ["reference_generation", ...]
      summary: "",
      retention: {},         // refId -> {appears, marker, note}
      styleOpening: "",
      shots: [],             // {id, timestamp, text}
      overallSoundscape: "",
      nonDiegetic: "",
      _nextRefId: 1,
      _nextShotId: 1,
    };
  }

  function uid(prefix) { return prefix + Math.random().toString(36).slice(2, 9); }

  /** ---------- Bootstrapping ---------- */
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const res = await fetch("/api/reference-data");
    RULES = await res.json();

    // theme
    const savedTheme = localStorage.getItem("minimax_theme");
    if (savedTheme === "light") document.documentElement.setAttribute("data-theme", "light");

    // restore last session, if any
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try { state = Object.assign(freshState(), JSON.parse(saved)); }
      catch (e) { /* ignore corrupt save */ }
    } else {
      // start with one empty shot so Detailed Description isn't blank
      state.shots.push({ id: uid("shot_"), timestamp: "", text: "" });
    }

    renderRefAddButtons();
    renderTaskChips();
    renderAll();
    wireStaticEvents();
  }

  function autosave() {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  function renderAll() {
    document.getElementById("projectName").value = state.projectName;
    renderReferences();
    renderSpeakers();
    updateTaskChipSelection();
    updatePrefixPreview();
    document.getElementById("summaryText").value = state.summary;
    document.getElementById("styleOpeningText").value = state.styleOpening;
    document.getElementById("soundscapeText").value = state.overallSoundscape;
    document.getElementById("musicText").value = state.nonDiegetic;
    renderShots();
    renderRetention();
    rebuildAllChipToolbars();
    updateWordCounter();
  }

  /** ================= REFERENCE LIBRARY ================= */

  function renderRefAddButtons() {
    const row = document.getElementById("refAddRow");
    row.innerHTML = "";
    RULES.referenceTypes.forEach(rt => {
      const btn = document.createElement("button");
      btn.className = "ref-add-btn";
      btn.style.borderColor = rt.color + "55";
      btn.innerHTML = `<span class="dot" style="background:${rt.color}"></span> + ${rt.tag}`;
      btn.title = rt.short;
      btn.addEventListener("click", () => addReference(rt.type));
      row.appendChild(btn);
    });
  }

  function typeColor(type) {
    const rt = RULES.referenceTypes.find(r => r.type === type);
    return rt ? rt.color : "#8b5cf6";
  }
  function typeTag(type) {
    const rt = RULES.referenceTypes.find(r => r.type === type);
    return rt ? rt.tag : type;
  }

  function renumberReferences() {
    const counters = {};
    state.references.forEach(ref => {
      counters[ref.type] = (counters[ref.type] || 0) + 1;
      ref.num = counters[ref.type];
    });
  }

  function addReference(type) {
    renumberReferences();
    const nextNum = state.references.filter(r => r.type === type).length + 1;
    state.references.push({
      id: uid("ref_"),
      type,
      num: nextNum,
      description: "",
      citationOnly: false,
    });
    renumberReferences();
    renderReferences();
    renderRetention();
    rebuildAllChipToolbars();
    autosave();
  }

  function removeReference(id) {
    state.references = state.references.filter(r => r.id !== id);
    delete state.retention[id];
    renumberReferences();
    renderReferences();
    renderRetention();
    rebuildAllChipToolbars();
    autosave();
  }

  function refLabel(ref) {
    return `<${typeTag(ref.type)} ${ref.num}>`;
  }

  function renderReferences() {
    const list = document.getElementById("refList");
    list.innerHTML = "";
    if (state.references.length === 0) {
      const p = document.createElement("p");
      p.className = "empty-hint";
      p.textContent = "No references yet — add one above.";
      list.appendChild(p);
      return;
    }
    state.references.forEach(ref => {
      const card = document.createElement("div");
      card.className = "ref-card";
      card.dataset.refId = ref.id;
      card.style.setProperty("--card-color", typeColor(ref.type));
      const canBeCitationOnly = ref.type === "picture" || ref.type === "video";
      const citationOnlyRow = canBeCitationOnly ? `
        <label class="ref-card-citation-toggle">
          <input type="checkbox" data-field="citationOnly" ${ref.citationOnly ? "checked" : ""} />
          Source only — cited inline in a Subject (skip its own write-up line)
        </label>` : "";
      card.innerHTML = `
        <div class="ref-card-top">
          <span class="ref-card-label" style="color:${typeColor(ref.type)}">${escapeHtml(refLabel(ref))}</span>
          <div class="ref-card-actions">
            <button class="ref-card-del" title="Remove">&times;</button>
          </div>
        </div>
        <textarea placeholder="is the ... (describe appearance, role, and where it comes from)">${escapeHtml(ref.description)}</textarea>
        <div class="chip-toolbar ref-card-cross-toolbar" data-ref-cross-toolbar></div>
        ${citationOnlyRow}
      `;
      const textarea = card.querySelector("textarea");
      textarea.addEventListener("input", () => { ref.description = textarea.value; autosave(); });
      card.querySelector(".ref-card-del").addEventListener("click", () => removeReference(ref.id));
      // Cross-reference toolbar: every OTHER reference's token, insertable into
      // this card's own description (e.g. typing Subject 2's definition and
      // clicking <Subject 1> to say "is Subject 1's face").
      buildChipToolbar(card.querySelector("[data-ref-cross-toolbar]"), textarea, false, ref.id);
      const citationCheckbox = card.querySelector('[data-field="citationOnly"]');
      if (citationCheckbox) {
        citationCheckbox.addEventListener("change", (e) => {
          ref.citationOnly = e.target.checked;
          renderRetention();
          autosave();
        });
      }
      list.appendChild(card);
    });
  }

  /** ================= SPEAKERS ================= */

  function renderSpeakers() {
    const row = document.getElementById("speakerChipRow");
    row.innerHTML = "";
    state.speakers.forEach(sx => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.dataset.insertToken = `(${sx})`;
      chip.textContent = `(${sx})`;
      row.appendChild(chip);
    });
  }

  document.addEventListener("click", (e) => {
    // global delegate for "insert token" style buttons that live inside dynamic content
    if (e.target.matches(".chip[data-insert-token]") && e.target.closest("#speakerChipRow")) {
      // handled per-toolbar via rebuildAllChipToolbars binding; speakers panel chips
      // are informational-only there (no direct target), ignore.
    }
  });

  function nextSpeakerId() {
    return "S" + (state.speakers.length + 1);
  }

  /** ================= TASK TYPES / SUMMARY ================= */

  function renderTaskChips() {
    const row = document.getElementById("taskChipRow");
    row.innerHTML = "";
    RULES.taskTypes.forEach(t => {
      const chip = document.createElement("button");
      chip.className = "task-chip";
      chip.textContent = t.label;
      chip.title = t.help;
      chip.dataset.id = t.id;
      chip.addEventListener("click", () => {
        const idx = state.taskTypes.indexOf(t.id);
        if (idx === -1) state.taskTypes.push(t.id); else state.taskTypes.splice(idx, 1);
        updateTaskChipSelection();
        updatePrefixPreview();
        autosave();
      });
      row.appendChild(chip);
    });
  }

  function updateTaskChipSelection() {
    document.querySelectorAll(".task-chip").forEach(chip => {
      chip.classList.toggle("selected", state.taskTypes.includes(chip.dataset.id));
    });
  }

  function taskPrefix() {
    const labels = state.taskTypes
      .map(id => RULES.taskTypes.find(t => t.id === id))
      .filter(Boolean)
      .map(t => t.label);
    return labels.length ? `[${labels.join(" + ")}]` : "[ ]";
  }

  function updatePrefixPreview() {
    document.getElementById("prefixPreview").textContent = taskPrefix();
  }

  /** ================= RETENTION ANALYSIS ================= */

  function ensureRetentionEntry(refId) {
    if (!state.retention[refId]) {
      state.retention[refId] = { appears: "", marker: "", note: "", shotIds: [], roleNote: "" };
    }
    if (state.retention[refId].shotIds === undefined) state.retention[refId].shotIds = [];
    if (state.retention[refId].roleNote === undefined) state.retention[refId].roleNote = "";
    return state.retention[refId];
  }

  /** Rebuilds entry.appears from the picked shots + optional free-text role
   *  note, so "Appears in / role" never has to be hand-typed. Subjects get
   *  the "appears in [Shot N], ..." phrasing the guide uses; Pictures/Videos
   *  get the terser "[Shot N] <role>" / "<role>" phrasing instead. */
  function recomputeAppears(ref, entry) {
    const shotLabels = (entry.shotIds || [])
      .map(sid => state.shots.findIndex(s => s.id === sid))
      .filter(i => i !== -1)
      .sort((a, b) => a - b)
      .map(i => `[Shot ${i + 1}]`);
    const role = (entry.roleNote || "").trim();

    if (ref.type === "subject") {
      let appears = shotLabels.length ? `appears in ${shotLabels.join(", ")}` : "";
      if (role) appears = appears ? `${appears} — ${role}` : role;
      entry.appears = appears;
    } else {
      let appears = shotLabels.join(", ");
      if (role) appears = appears ? `${appears} ${role}` : role;
      entry.appears = appears;
    }
  }

  function renderRetention() {
    const list = document.getElementById("retentionList");
    const emptyHint = document.getElementById("retentionEmptyHint");
    list.innerHTML = "";
    if (state.references.length === 0) {
      emptyHint.style.display = "block";
      return;
    }
    emptyHint.style.display = "none";

    state.references.forEach(ref => {
      const entry = ensureRetentionEntry(ref.id);
      const isAudio = ref.type === "audio";
      const markers = isAudio ? RULES.audioMarkers : RULES.visualMarkers;

      const row = document.createElement("div");

      if (ref.citationOnly) {
        row.className = "retention-row retention-row-skipped";
        row.innerHTML = `
          <div class="retention-row-head">
            <span class="retention-label" style="background:${typeColor(ref.type)}22; color:${typeColor(ref.type)}" title="${escapeAttr(chipTooltip(ref))}">${escapeHtml(refLabel(ref))}</span>
          </div>
          <p class="empty-hint" style="margin:4px 0 0;">Marked "source only" — cited inline inside a Subject, so it skips its own retention row and subject_definitions line. Uncheck that box on its card to give it one.</p>
        `;
        list.appendChild(row);
        return;
      }

      row.className = "retention-row";

      const shotPickerHtml = state.shots.length
        ? state.shots.map((s, i) => `<button type="button" class="shot-toggle-chip ${entry.shotIds.includes(s.id) ? "selected" : ""}" data-shot-id="${s.id}">Shot ${i + 1}</button>`).join("")
        : `<span class="panel-hint" style="margin:0;">Add a shot in Detailed Description to pick from here.</span>`;

      const appearsField = isAudio ? "" : `
        <div class="retention-appears-field">
          <label>Appears in / role</label>
          <div class="shot-picker-row" data-shot-picker>${shotPickerHtml}</div>
          <input type="text" class="small-input" data-field="roleNote" placeholder="optional — e.g. first frame, source likeness, cut and pacing structure" value="${escapeAttr(entry.roleNote)}" />
          <p class="appears-preview">${escapeHtml(entry.appears) || "&nbsp;"}</p>
        </div>`;

      row.innerHTML = `
        <div class="retention-row-head">
          <span class="retention-label" style="background:${typeColor(ref.type)}22; color:${typeColor(ref.type)}" title="${escapeAttr(chipTooltip(ref))}">${escapeHtml(refLabel(ref))}</span>
        </div>
        <div class="retention-fields ${isAudio ? "audio-fields" : ""}">
          ${appearsField}
          <div>
            <label>Relationship</label>
            <select class="small-input" data-field="marker">
              <option value="">— choose —</option>
              ${markers.map(m => `<option value="${m.id}" ${entry.marker === m.id ? "selected" : ""}>${m.label}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="retention-note-row">
          <label>Note (the "-" explanation)</label>
          <input type="text" class="small-input" data-field="note" placeholder="what exactly is retained / changed" value="${escapeAttr(entry.note)}" />
        </div>
      `;

      if (!isAudio) {
        row.querySelectorAll("[data-shot-id]").forEach(btn => {
          btn.addEventListener("click", () => {
            const sid = btn.dataset.shotId;
            const idx = entry.shotIds.indexOf(sid);
            if (idx === -1) entry.shotIds.push(sid); else entry.shotIds.splice(idx, 1);
            recomputeAppears(ref, entry);
            autosave();
            renderRetention();
          });
        });
        row.querySelector('[data-field="roleNote"]').addEventListener("input", (e) => {
          entry.roleNote = e.target.value;
          recomputeAppears(ref, entry);
          row.querySelector(".appears-preview").textContent = entry.appears || "\u00a0";
          autosave();
        });
      }
      row.querySelector('[data-field="marker"]').addEventListener("change", (e) => { entry.marker = e.target.value; autosave(); });
      row.querySelector('[data-field="note"]').addEventListener("input", (e) => { entry.note = e.target.value; autosave(); });

      list.appendChild(row);
    });
  }

  /** ================= SHOTS / DETAILED DESCRIPTION ================= */

  function renderShots() {
    const list = document.getElementById("shotsList");
    list.innerHTML = "";
    state.shots.forEach((shot, idx) => {
      const shotNum = idx + 1;
      const card = document.createElement("div");
      card.className = "shot-card";

      const timestampHtml = idx === 0
        ? `<span class="shot-timestamp-hint">no timestamp on the opening shot</span>`
        : `<input type="text" class="small-input shot-timestamp-input" placeholder="e.g. 2.5" value="${escapeAttr(shot.timestamp)}" data-field="timestamp" title="Type seconds (2.5), minutes:seconds (1:02.5), or the full MM:SS.mmm - it auto-formats when you click away" />`;

      card.innerHTML = `
        <div class="shot-card-head">
          <span class="shot-badge">Shot ${shotNum}</span>
          ${timestampHtml}
          <button class="shot-del-btn" title="Remove shot">&times;</button>
        </div>
        <div class="chip-toolbar" data-shot-toolbar></div>
        <textarea class="big-textarea shot-textarea" placeholder="Composition, subjects, action, camera movement, sound, and dialogue for this shot..."></textarea>
        <div class="shot-quick-tags" data-shot-quicktags></div>
      `;

      const textarea = card.querySelector("textarea");
      textarea.value = shot.text;
      textarea.addEventListener("input", () => { shot.text = textarea.value; updateWordCounter(); autosave(); });

      if (idx > 0) {
        const tsInput = card.querySelector('[data-field="timestamp"]');
        tsInput.addEventListener("input", (e) => { shot.timestamp = e.target.value; autosave(); });
        tsInput.addEventListener("blur", (e) => {
          const formatted = formatTimestamp(e.target.value);
          e.target.value = formatted;
          shot.timestamp = formatted;
          autosave();
        });
        tsInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") e.target.blur(); // let Enter trigger the auto-format too
        });
      }

      card.querySelector(".shot-del-btn").addEventListener("click", () => {
        state.shots = state.shots.filter(s => s.id !== shot.id);
        // drop that shot from every retention entry's picker, since a
        // deleted shot's [Shot N] token would otherwise dangle
        Object.values(state.retention).forEach(entry => {
          if (entry.shotIds) entry.shotIds = entry.shotIds.filter(sid => sid !== shot.id);
        });
        renderShots();
        renderRetention();
        rebuildAllChipToolbars();
        updateWordCounter();
        autosave();
      });

      // reference + speaker chips for this shot
      buildChipToolbar(card.querySelector("[data-shot-toolbar]"), textarea, true);

      // quick tags (dialogue, scenetrans, cutoff, unclear)
      const qt = card.querySelector("[data-shot-quicktags]");
      RULES.quickTags.forEach(tag => {
        const b = document.createElement("button");
        b.className = "quick-tag-chip";
        b.textContent = tag.label;
        b.title = tag.help;
        b.addEventListener("click", () => {
          if (tag.id === "dialogue") {
            insertDialogue(textarea);
          } else {
            insertAtCursor(textarea, tag.insert);
          }
        });
        qt.appendChild(b);
      });

      list.appendChild(card);
    });
  }

  /** Accepts "2.5", "62", "1:02.5", or an already-correct "00:02.500" and
   *  normalizes it to MM:SS.mmm. Anything it can't parse is left untouched
   *  so the user can fix it by hand. */
  function formatTimestamp(raw) {
    raw = (raw || "").trim();
    if (!raw) return "";

    let totalSeconds;
    const withColon = raw.match(/^(\d{1,3}):(\d{1,2}(?:\.\d+)?)$/);
    const plainNumber = raw.match(/^\d+(?:\.\d+)?$/);

    if (withColon) {
      totalSeconds = parseInt(withColon[1], 10) * 60 + parseFloat(withColon[2]);
    } else if (plainNumber) {
      totalSeconds = parseFloat(raw); // treat a bare number as seconds
    } else {
      return raw; // unrecognized shape - don't mangle it, let them fix it
    }

    const mins = Math.floor(totalSeconds / 60);
    const secsFloat = totalSeconds - mins * 60;
    const secsInt = Math.floor(secsFloat);
    const ms = Math.round((secsFloat - secsInt) * 1000);
    const pad2 = n => String(n).padStart(2, "0");
    const pad3 = n => String(n).padStart(3, "0");
    return `${pad2(mins)}:${pad2(secsInt)}.${pad3(ms)}`;
  }

  function insertDialogue(textarea) {
    const start = textarea.selectionStart, end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    const wrapped = selected ? `<d>[English] ${selected}</d>` : `<d>[English] </d>`;
    textarea.setRangeText(wrapped, start, end, "end");
    // place cursor right before the closing tag if nothing was selected
    if (!selected) {
      const cursorPos = start + wrapped.length - 4;
      textarea.selectionStart = textarea.selectionEnd = cursorPos;
    }
    textarea.dispatchEvent(new Event("input"));
    textarea.focus();
  }

  document.getElementById("btnAddShot")?.addEventListener("click", () => {
    state.shots.push({ id: uid("shot_"), timestamp: "", text: "" });
    renderShots();
    renderRetention();
    rebuildAllChipToolbars();
    updateWordCounter();
    autosave();
  });

  /** ================= CHIP TOOLBARS (reference + speaker insert helpers) ================= */

  /** Short hover text for a reference chip: the label plus a trimmed
   *  preview of its description, so you can tell which <Subject 3> is
   *  which without leaving the shot / switching tabs. */
  function chipTooltip(ref) {
    const desc = (ref.description || "").trim();
    if (!desc) return `${refLabel(ref)} — no description yet (fill it in on the left)`;
    const preview = desc.length > 140 ? desc.slice(0, 140).trim() + "…" : desc;
    return `${refLabel(ref)} ${preview}`;
  }

  function buildChipToolbar(container, textareaEl, includeSpeakers, excludeRefId) {
    container.innerHTML = "";
    const refs = state.references.filter(r => r.id !== excludeRefId);
    if (refs.length === 0 && (!includeSpeakers || state.speakers.length === 0)) {
      const hint = document.createElement("span");
      hint.className = "panel-hint";
      hint.style.margin = "0";
      hint.textContent = excludeRefId
        ? "Add another reference card to cross-reference it here."
        : "Add references (or speakers) to get quick-insert buttons here.";
      container.appendChild(hint);
      return;
    }
    refs.forEach(ref => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.innerHTML = `<span class="swatch" style="background:${typeColor(ref.type)}"></span>${escapeHtml(refLabel(ref))}`;
      chip.title = chipTooltip(ref);
      chip.addEventListener("click", () => insertAtCursor(textareaEl, refLabel(ref) + " "));
      container.appendChild(chip);
    });
    if (includeSpeakers) {
      state.speakers.forEach(sx => {
        const chip = document.createElement("button");
        chip.className = "chip";
        chip.textContent = `(${sx})`;
        chip.addEventListener("click", () => insertAtCursor(textareaEl, `(${sx}) `));
        container.appendChild(chip);
      });
    }
  }

  function rebuildAllChipToolbars() {
    document.querySelectorAll(".chip-toolbar[data-target]").forEach(el => {
      const target = document.getElementById(el.dataset.target);
      if (target) buildChipToolbar(el, target, false);
    });
    // shot toolbars are rebuilt as part of renderShots(), but if refs/speakers
    // changed without a full shot re-render, refresh them too:
    document.querySelectorAll(".shot-card [data-shot-toolbar]").forEach((el, i) => {
      const textarea = el.closest(".shot-card").querySelector("textarea");
      buildChipToolbar(el, textarea, true);
    });
    // per-card cross-reference toolbars (exclude that card's own token)
    document.querySelectorAll(".ref-card[data-ref-id]").forEach(card => {
      const toolbar = card.querySelector("[data-ref-cross-toolbar]");
      const textarea = card.querySelector("textarea");
      if (toolbar && textarea) buildChipToolbar(toolbar, textarea, false, card.dataset.refId);
    });
  }

  function insertAtCursor(el, text) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.setRangeText(text, start, end, "end");
    el.dispatchEvent(new Event("input"));
    el.focus();
  }

  /** ================= WORD COUNTER ================= */

  function countWords(text) {
    const m = text.trim().match(/\S+/g);
    return m ? m.length : 0;
  }

  function updateWordCounter() {
    const total = countWords(state.styleOpening) + state.shots.reduce((sum, s) => sum + countWords(s.text), 0);
    const el = document.getElementById("wordCounter");
    el.textContent = `${total} words`;
    el.classList.remove("good", "warn");
    const isEditingTask = state.taskTypes.includes("video_editing") || state.taskTypes.includes("video_continuation");
    if (!isEditingTask) {
      if (total >= 350 && total <= 500) el.classList.add("good");
      else if (total > 0) el.classList.add("warn");
    }
  }

  /** ================= COMPILE ================= */

  function buildSubjectDefinitions() {
    const included = state.references.filter(ref => !ref.citationOnly);
    if (included.length === 0) return "";
    const lines = included.map(ref => {
      const body = ref.description.trim() || "is (describe this reference)";
      return `${refLabel(ref)} ${body}`;
    });
    return `subject_definitions:\n${lines.join("\n")}`;
  }

  function buildSummary() {
    const text = state.summary.trim() || "(describe the target video and its reference relationships)";
    return `summary:\n${taskPrefix()} ${text}`;
  }

  function buildRetention() {
    const included = state.references.filter(ref => !ref.citationOnly);
    if (included.length === 0) return "";
    const lines = included.map(ref => {
      const entry = ensureRetentionEntry(ref.id);
      const marker = entry.marker || "(choose relationship)";
      const note = entry.note.trim() || "(explain what's retained / changed)";
      if (ref.type === "audio") {
        return `${refLabel(ref)}: ${marker} - ${note}`;
      }
      const appears = entry.appears.trim() || "(where it appears)";
      return `${refLabel(ref)} (${appears}): ${marker} - ${note}`;
    });
    return `retention_analysis:\n${lines.join("\n")}`;
  }

  function buildDetailed() {
    const parts = [];
    if (state.styleOpening.trim()) parts.push(state.styleOpening.trim());
    state.shots.forEach((shot, idx) => {
      const body = shot.text.trim() || "(describe this shot)";
      if (idx === 0) {
        parts.push(`[Shot 1] ${body}`);
      } else {
        const ts = shot.timestamp.trim() || "MM:SS.mmm";
        parts.push(`[Shot ${idx + 1}] At ${ts}, ${body}`);
      }
    });
    return `detailed_description:\n${parts.join("\n")}`;
  }

  function buildSoundscape() {
    return `overall_soundscape:\n${state.overallSoundscape.trim() || "N/A"}`;
  }

  function buildMusic() {
    return `non_diegetic_music:\n${state.nonDiegetic.trim() || "N/A"}`;
  }

  function collectWarnings() {
    const warnings = [];
    const wholeText = [
      state.summary, state.styleOpening,
      ...state.shots.map(s => s.text),
      ...Object.values(state.retention).map(r => r.note || ""),
      ...state.references.map(r => r.description || ""),
    ].join(" \n ");

    state.references.forEach(ref => {
      const label = refLabel(ref);
      if (ref.citationOnly) {
        // Source-only refs skip their own description/retention entry by
        // design — but they still need to actually be cited by name inside
        // whichever Subject (or other card) description uses them.
        const usedElsewhere = wholeText.includes(label);
        if (!usedElsewhere) {
          warnings.push(`${label} is marked "source only" but isn't cited by name inside any Subject's description yet.`);
        }
        return;
      }
      if (!ref.description.trim()) {
        warnings.push(`${label} has no description yet.`);
      }
      const usedElsewhere = wholeText.includes(label);
      if (!usedElsewhere) {
        warnings.push(`${label} is defined but never referenced in the summary, retention notes, or shots.`);
      }
      const entry = state.retention[ref.id];
      if (!entry || !entry.marker) {
        warnings.push(`${label} has no relationship marker chosen in Retention Analysis.`);
      }
    });

    if (state.taskTypes.length === 0) {
      warnings.push("No task type selected — the summary prefix will be empty.");
    }
    if (state.shots.length === 0 || !state.shots[0].text.trim()) {
      warnings.push("Shot 1 has no description yet.");
    }
    return warnings;
  }

  function compile() {
    const sections = [];
    const subj = buildSubjectDefinitions();
    if (subj) sections.push(subj);
    sections.push(buildSummary());
    const ret = buildRetention();
    if (ret) sections.push(ret);
    sections.push(buildDetailed());
    sections.push(buildSoundscape());
    sections.push(buildMusic());
    return sections.join("\n\n");
  }

  document.getElementById("btnCompile").addEventListener("click", () => {
    const output = compile();
    const warnings = collectWarnings();
    const warnBox = document.getElementById("compileWarnings");
    if (warnings.length) {
      warnBox.style.display = "block";
      warnBox.innerHTML = "<strong>Heads up:</strong><br>" + warnings.map(w => "• " + escapeHtml(w)).join("<br>");
    } else {
      warnBox.style.display = "none";
    }
    document.getElementById("compileOutput").value = output;
    openModal("compileModalOverlay");
  });

  document.getElementById("btnCopyCompiled").addEventListener("click", async () => {
    const ta = document.getElementById("compileOutput");
    try {
      await navigator.clipboard.writeText(ta.value);
      showToast("Copied to clipboard ✓");
    } catch (e) {
      ta.select();
      document.execCommand("copy");
      showToast("Copied to clipboard ✓");
    }
  });

  document.getElementById("btnDownloadTxt").addEventListener("click", () => {
    const ta = document.getElementById("compileOutput");
    const blob = new Blob([ta.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (state.projectName || "prompt").replace(/[^a-z0-9_\-]+/gi, "_");
    a.href = url;
    a.download = `${safeName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  /** ================= TABS ================= */

  function wireTabs() {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
      });
    });
  }

  /** ================= MODALS ================= */

  function openModal(id) { document.getElementById(id).classList.add("open"); }
  function closeModal(id) { document.getElementById(id).classList.remove("open"); }

  function wireModalClosers() {
    document.querySelectorAll("[data-close]").forEach(btn => {
      btn.addEventListener("click", () => closeModal(btn.dataset.close));
    });
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
      overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") document.querySelectorAll(".modal-overlay.open").forEach(o => o.classList.remove("open"));
    });
  }

  /** ================= INFO (i) BUTTONS ================= */

  const HELP_TITLES = {
    library: "Reference Library",
    speakers: "Speakers",
    tasktype: "Task Type",
    summary: "Summary",
    retention: "Retention Analysis",
    styleopening: "Style Opening",
    detailed_description: "Shots / Detailed Description",
    overall_soundscape: "Overall Soundscape",
    non_diegetic_music: "Non-Diegetic Music",
  };

  function helpTextFor(key) {
    if (key === "library") {
      return RULES.referenceTypes.map(rt => `${rt.tag}: ${rt.help}`).join("\n\n");
    }
    if (key === "speakers") {
      return "Assign a stable (S1), (S2)... ID the first time each voice actually speaks in your shots, in the order they first speak. Reuse the same ID every time that voice speaks again — including a Subject who speaks off-screen. Don't reassign or renumber IDs later.";
    }
    if (key === "tasktype") return RULES.taskTypeHelp;
    if (RULES.sectionHelp[key]) return RULES.sectionHelp[key];
    return "No help available for this section yet.";
  }

  function wireInfoButtons() {
    document.body.addEventListener("click", (e) => {
      const btn = e.target.closest(".i-btn");
      if (!btn) return;
      const key = btn.dataset.help;
      document.getElementById("infoModalTitle").textContent = HELP_TITLES[key] || "Help";
      document.getElementById("infoModalBody").textContent = helpTextFor(key);
      openModal("infoModalOverlay");
    });
  }

  /** ================= TOP BAR ACTIONS ================= */

  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function wireStaticEvents() {
    wireTabs();
    wireModalClosers();
    wireInfoButtons();

    document.getElementById("projectName").addEventListener("input", (e) => {
      state.projectName = e.target.value;
      autosave();
    });

    document.getElementById("summaryText").addEventListener("input", (e) => { state.summary = e.target.value; autosave(); });
    document.getElementById("styleOpeningText").addEventListener("input", (e) => { state.styleOpening = e.target.value; updateWordCounter(); autosave(); });
    document.getElementById("soundscapeText").addEventListener("input", (e) => { state.overallSoundscape = e.target.value; autosave(); });
    document.getElementById("musicText").addEventListener("input", (e) => { state.nonDiegetic = e.target.value; autosave(); });

    document.getElementById("btnAddSpeaker").addEventListener("click", () => {
      state.speakers.push(nextSpeakerId());
      renderSpeakers();
      rebuildAllChipToolbars();
      autosave();
    });

    document.getElementById("btnTheme").addEventListener("click", () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      if (isLight) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("minimax_theme", "dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("minimax_theme", "light");
      }
    });

    document.getElementById("btnNew").addEventListener("click", () => {
      if (!confirm("Start a new blank project? Unsaved changes in this project will be lost from the quick-restore slot.")) return;
      state = freshState();
      state.shots.push({ id: uid("shot_"), timestamp: "", text: "" });
      autosave();
      renderAll();
      showToast("New project started");
    });

    document.getElementById("btnSample").addEventListener("click", () => {
      if (!confirm("Load the sample project? This replaces your current work in the editor (your saved projects on disk are untouched).")) return;
      loadSample();
    });

    document.getElementById("btnSave").addEventListener("click", async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (res.ok) showToast("Saved ✓");
      else showToast("Save failed");
    });

    document.getElementById("btnLoad").addEventListener("click", openLoadModal);

    document.getElementById("btnCheatSheet")?.addEventListener("click", () => {
      document.getElementById("infoModalTitle").textContent = "Camera, Cuts & Format Cheat Sheet";
      document.getElementById("infoModalBody").textContent = RULES.sharedBasicsHelp;
      openModal("infoModalOverlay");
    });
  }

  async function openLoadModal() {
    openModal("loadModalOverlay");
    const body = document.getElementById("projectListBody");
    body.textContent = "Loading…";
    const res = await fetch("/api/projects");
    const items = await res.json();
    if (!items.length) {
      body.innerHTML = '<p class="empty-hint">No saved projects yet — use Save on the top bar first.</p>';
      return;
    }
    body.innerHTML = "";
    items.forEach(p => {
      const row = document.createElement("div");
      row.className = "project-list-item";
      row.innerHTML = `<span class="pname">${escapeHtml(p.name)}</span><span class="pmeta">${p.updated}</span><button class="pdel" title="Delete">&times;</button>`;
      row.addEventListener("click", async (e) => {
        if (e.target.classList.contains("pdel")) return;
        const r = await fetch(`/api/projects/${encodeURIComponent(p.file)}`);
        if (r.ok) {
          const data = await r.json();
          state = Object.assign(freshState(), data);
          renderAll();
          autosave();
          closeModal("loadModalOverlay");
          showToast(`Loaded "${state.projectName}"`);
        }
      });
      row.querySelector(".pdel").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete saved project "${p.name}"? This can't be undone.`)) return;
        await fetch(`/api/projects/${encodeURIComponent(p.file)}`, { method: "DELETE" });
        openLoadModal();
      });
      body.appendChild(row);
    });
  }

  /** ================= SAMPLE PROJECT ================= */

  function loadSample() {
    state = freshState();
    state.projectName = "Sample - Rooftop Reunion";
    state.taskTypes = ["reference_generation", "audio_reference"];
    state.references = [
      { id: uid("ref_"), type: "subject", num: 1, description: "is the man in <Picture 1>, with a shaved head, round tortoiseshell glasses, and a charcoal wool coat.", citationOnly: false },
      { id: uid("ref_"), type: "subject", num: 2, description: "is the rooftop bar environment in <Picture 2>, featuring string lights, a low concrete parapet, and a skyline of glass towers behind it.", citationOnly: false },
      { id: uid("ref_"), type: "picture", num: 1, description: "only defines Subject 1's appearance and isn't used as a frame anchor.", citationOnly: true },
      { id: uid("ref_"), type: "picture", num: 2, description: "only defines Subject 2's environment and isn't used as a frame anchor.", citationOnly: true },
      { id: uid("ref_"), type: "audio", num: 1, description: "is the voice-timbre and unhurried delivery reference for Subject 1 (S1).", citationOnly: false },
    ];
    state.summary = "The target video shows Subject 1 arriving at the rooftop bar in Subject 2 at dusk, greeting someone waiting at the parapet, with his voice guided by Audio 1's timbre and pacing.";
    state.styleOpening = "The target video is a warm, cinematic dusk scene with soft golden rim-lighting and a shallow depth of field.";
    state.speakers = ["S1"];
    state.shots = [
      {
        id: uid("shot_"), timestamp: "",
        text: "A wide shot establishes <Subject 2>, the rooftop bar with its string lights, low concrete parapet, and the glass-tower skyline glowing behind it in the last light of dusk. <Subject 1> (S1), the man with a shaved head, round tortoiseshell glasses, and a charcoal wool coat, walks toward the parapet, hands in his pockets, breath faintly visible in the cool air. The camera drifts slowly forward at a low, steady pace, keeping him centered.",
      },
      {
        id: uid("shot_"), timestamp: "00:04.500",
        text: "the shot cuts to a medium close-up of <Subject 1> (S1) as he reaches the parapet and leans against it, the skyline soft and glowing out of focus behind him. Using the unhurried voice timbre referenced from <Audio 1>, he says, <d>[English] I wasn't sure you'd actually come.</d> A faint smile crosses his face as the string lights flicker gently overhead.",
      },
    ];
    const [shot1, shot2] = state.shots;

    state.retention = {};
    const retentionFor = (ref) => {
      if (ref.type === "audio") {
        return { appears: "", marker: "reference", note: "the target speaker follows Audio 1's relaxed timbre and pacing without copying the original signal.", shotIds: [], roleNote: "" };
      }
      if (ref.type === "picture") {
        const entry = ref.num === 1
          ? { marker: "fully_preserved", note: "the man's shaved head, glasses, and coat are carried through unchanged.", shotIds: [shot1.id], roleNote: "source likeness" }
          : { marker: "fully_preserved", note: "the rooftop bar's layout, lighting, and skyline are carried through unchanged.", shotIds: [shot1.id], roleNote: "source likeness" };
        return entry;
      }
      // subject
      const entry = ref.num === 1
        ? { marker: "fully_preserved", note: "the man's shaved head, glasses, and charcoal coat stay consistent across both shots.", shotIds: [shot1.id, shot2.id], roleNote: "" }
        : { marker: "fully_preserved", note: "the string lights, parapet, and skyline stay consistent across both shots.", shotIds: [shot1.id, shot2.id], roleNote: "" };
      return entry;
    };
    state.references.forEach(ref => {
      const entry = retentionFor(ref);
      entry.appears = "";
      state.retention[ref.id] = entry;
      recomputeAppears(ref, entry);
    });

    state.overallSoundscape = "A soft ambient city hum and faint clinking glassware continue quietly under the whole scene.";
    state.nonDiegetic = "A slow, sparse piano motif plays underneath, gradually adding a warm string pad as the second shot begins.";

    renderTaskChips();
    renderAll();
    autosave();
    showToast("Sample loaded");
  }

  /** ================= UTIL ================= */

  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
  }
  function escapeAttr(str) { return escapeHtml(str); }

})();
