"""
reference_data.py
------------------
Single source of truth for every rule, label, and help-text snippet used by
Minimax Prompt Builder. This file mirrors the MiniMax H3 full-reference
prompt-writing guide, condensed into the pieces the UI actually needs:

    - the four reference-label types (Subject / Picture / Video / Audio)
    - the six task-type prefixes
    - the retention-analysis relationship markers (visual + audio)
    - the quick-insert dialogue / continuity tags
    - the "i" button help text shown in popups throughout the app

Keeping all of this in one Python file (instead of scattering strings across
the HTML/JS) means updating the rules later is a one-file job.
"""

# ---------------------------------------------------------------------------
# Reference label types (the +Add card buttons)
# ---------------------------------------------------------------------------
REFERENCE_TYPES = [
    {
        "type": "subject",
        "tag": "Subject",
        "color": "#8b5cf6",
        "short": "A reusable person, animal, object, environment, prop, style, or action.",
        "help": (
            "Use a Subject card for anything that will actually appear in your "
            "generated video and needs to stay consistent: a person, animal, "
            "object, scene/environment, clothing, prop, interface element, visual "
            "effect, or even a style, pose, or action.\n\n"
            "A Subject represents the content itself, not the source file it came "
            "from. One subject can be built from more than one reference (e.g. "
            "\"appearance from Picture 1, walking motion from Video 1\") — if that's "
            "the case, just say so in the description box.\n\n"
            "Tip: once you add a Subject card, use the small chip button to drop "
            "\"<Subject N>\" into any field without retyping it."
        ),
    },
    {
        "type": "picture",
        "tag": "Picture",
        "color": "#22d3ee",
        "short": "A reference image used as a concrete frame or storyboard anchor.",
        "help": (
            "Only create a Picture card when the image itself is being used as a "
            "concrete anchor — a shot's first frame, a keyframe, a last frame, an "
            "edited keyframe, or a storyboard/shot-planning reference.\n\n"
            "If an image is only there to define what a character, scene, costume, "
            "or style looks like, you don't need a separate Picture card — just "
            "mention the image inside the matching Subject card's description "
            "instead (e.g. \"the woman in Picture 1\")."
        ),
    },
    {
        "type": "video",
        "tag": "Video",
        "color": "#f472b6",
        "short": "A whole reference video being edited, continued, or copied for structure.",
        "help": (
            "Video cards are for whole-video relationships: directly editing an "
            "existing video, continuing/extending from one, or borrowing its "
            "camera movement, cut rhythm, or overall temporal structure.\n\n"
            "If you're really just reusing a person, object, or action that "
            "happens to appear in a reference video, that content still belongs "
            "on a Subject card — Video identifies the source asset or its "
            "structure, it doesn't replace Subject labels.\n\n"
            "Subject and Picture/Video numbering are independent — Video 1 and "
            "Audio 2 can come from the very same file."
        ),
    },
    {
        "type": "audio",
        "tag": "Audio",
        "color": "#facc15",
        "short": "An audio signal that's copied or referenced (voice, music, SFX).",
        "help": (
            "Use an Audio card for a standalone audio file, or an enabled "
            "synced-audio track from a reference video, whenever it's copied or "
            "referenced in the output — voice timbre, a music style, dialogue or "
            "lyric content, sound-effect texture, or beat/rhythm continuity.\n\n"
            "If this audio is the voice of a specific speaker, link it to that "
            "speaker's ID once you've assigned one in the Detailed Description "
            "section (it will show up as e.g. \"Audio 1 is the voice-timbre "
            "reference for Subject 1 (S1)\").\n\n"
            "A reference video simply having sound doesn't automatically need an "
            "Audio card — only add one if that audio itself is actually being "
            "used or referenced."
        ),
    },
]

# ---------------------------------------------------------------------------
# Task-type prefix (used to open the summary line, e.g. "[reference generation]")
# ---------------------------------------------------------------------------
TASK_TYPES = [
    {
        "id": "keyframe_completion",
        "label": "keyframe completion",
        "help": "An image serves as the target video's first frame, a keyframe, last frame, or another concrete frame anchor.",
    },
    {
        "id": "reference_generation",
        "label": "reference generation",
        "help": "An image, video, or audio asset guides a character, scene, style, action, camera move, or storyboard — without being a concrete frame or the video being edited/continued.",
    },
    {
        "id": "video_editing",
        "label": "video editing",
        "help": "An existing source video is directly modified. Editing a still image, or generating between still keyframes, doesn't count.",
    },
    {
        "id": "video_continuation",
        "label": "video continuation",
        "help": "New content continues, extends, resumes, or transitions from an existing source video.",
    },
    {
        "id": "audio_reuse",
        "label": "audio reuse",
        "help": "The same audio signal is reused, in full or in part, as the target video's own audio.",
    },
    {
        "id": "audio_reference",
        "label": "audio reference",
        "help": "The audio signal is not copied directly — only its music style, timbre, dialogue/lyric content, sound texture, or beat/continuity is referenced.",
    },
]

TASK_TYPE_HELP = (
    "The summary opens with a bracketed prefix naming every task type that "
    "actually applies, joined with \" + \" (e.g. \"[video continuation + "
    "keyframe completion]\"). Don't repeat a type. A reference video that only "
    "lends its camera movement or cutting rhythm is normally 'reference "
    "generation' — only call it 'video editing' or 'video continuation' when "
    "that footage is directly edited or continued. If audio remains audible "
    "while you edit a source video, add 'audio reuse' too."
)

# ---------------------------------------------------------------------------
# Retention-analysis relationship markers
# ---------------------------------------------------------------------------
VISUAL_MARKERS = [
    {"id": "fully_preserved", "label": "fully_preserved", "help": "The defined role of this reference is fully preserved as-is."},
    {"id": "partially_preserved", "label": "partially_preserved", "help": "Still used, but some defined characteristics are changed or only partly retained."},
    {"id": "attribute_transfer", "label": "attribute_transfer", "help": "Referenced characteristics are transferred onto a different, identifiable subject."},
    {"id": "weak_reference", "label": "weak_reference", "help": "Only broad similarity in style, category, composition, or atmosphere is retained."},
]

AUDIO_MARKERS = [
    {"id": "fully_copy", "label": "fully_copy", "help": "The complete source audio serves as the target video's complete final audio track."},
    {"id": "partially_copy", "label": "partially_copy", "help": "Only part of the timeline or selected layers are copied, or sounds are added/removed/replaced after copying."},
    {"id": "reference", "label": "reference", "help": "The signal isn't copied directly — only timbre, rhythm, style, dialogue content, or texture is referenced."},
    {"id": "weak_reference", "label": "weak_reference", "help": "Only broad similarity in category or atmosphere is retained."},
]

RETENTION_HELP = (
    "One line per reference label, describing how it's actually preserved, "
    "changed, or referenced in your video. Subjects/Pictures/Video-structure "
    "use fully_preserved, partially_preserved, attribute_transfer, or "
    "weak_reference. Audio uses fully_copy, partially_copy, reference, or "
    "weak_reference instead. New actions or background details you added "
    "yourself aren't a loss of fidelity — don't mark those down."
)

# ---------------------------------------------------------------------------
# Quick-insert tags available inside each shot card
# ---------------------------------------------------------------------------
QUICK_TAGS = [
    {"id": "dialogue", "label": "<d> dialogue", "insert": "<d>[English] </d>", "help": "Wraps spoken dialogue or lyrics. Keep the original language/wording when reusing reference audio; write [unclear] for spans you can't make out."},
    {"id": "scenetrans", "label": "<scenetrans>", "insert": "<scenetrans>", "help": "Marks dialogue that continues across a cut / scene transition."},
    {"id": "cutoff", "label": "<cutoff>", "insert": "<cutoff>", "help": "Marks speech that gets truncated by the video simply ending."},
    {"id": "unclear", "label": "[unclear]", "insert": "[unclear]", "help": "Use instead of guessing at words you can't make out in reused reference audio."},
]

SHARED_BASICS_HELP = (
    "Full-reference mode only re-explains what's specific to it (reference labels, "
    "retention analysis). These formatting basics are inherited from the base Video "
    "Prompt Writing Guide (T2VA/I2VA/FL2VA/L2VA) and are expected knowledge when you "
    "write shot text freehand — nothing here is auto-inserted for you.\n\n"
    "CAMERA MOTION — motion type + amplitude + speed, written as a natural sentence, "
    "not stacked labels:\n"
    "  Motion type: Zoom In/Out, Push In/Pull Out, Pan Left/Right, Truck Left/Right, "
    "Tilt Up/Down, Pedestal Up/Down, Arc Shot, Tracking Shot, Static Shot, Shake "
    "Slightly/Strongly, POV, Roll Clockwise/Counterclockwise.\n"
    "  Amplitude (omit if medium): 'with small amplitude' / 'with large amplitude'.\n"
    "  Speed (omit if normal): 'at slow speed' / 'at fast speed'.\n"
    "  e.g. \"The camera pushes in with small amplitude at slow speed toward the "
    "folded letter.\"\n\n"
    "CUTS — a cut should introduce new info (subject/space/state/viewpoint/time); if "
    "only distance or angle shifts slightly, prefer camera motion instead. Ordinary "
    "cuts: 'the camera cuts to', 'the shot cuts to', 'the shot transitions to', 'the "
    "shot changes to', 'the shot switches to'. Cross-dissolve/fade/wipe only when the "
    "user explicitly asks for one.\n\n"
    "GROUP SPEECH — when two already-numbered speakers speak or sing together, use a "
    "compound ID: '(S1,S2)'.\n\n"
    "VOICEOVER — use the exact phrase 'says in an off-screen voiceover', and "
    "immediately state that the on-screen character's lips stay closed:\n"
    "  \"The man (S1) says in an off-screen voiceover: <d>[English] I still remember "
    "that road.</d> while his lips remain completely closed.\"\n\n"
    "DIALOGUE ACROSS A CUT / END OF VIDEO — use the <scenetrans> quick-tag at both "
    "connecting points and say the audio continues ('continues seamlessly across the "
    "cut', 'carries over from the previous shot', 'remains audible across the "
    "transition'); use <cutoff> when speech is truncated by the video simply ending.\n\n"
    "ON-SCREEN TEXT — any sign, banner, subtitle, or neon text actually visible in "
    "the shot goes in English double quotation marks, original wording and "
    "punctuation preserved, not translated:\n"
    "  A red neon sign reading \"营业中\" glows above the doorway.\n\n"
    "DIALOGUE PUNCTUATION — inside <d>, standardize to basic marks (, . ? !); strip "
    "repeated tildes, emoji, bullets, or decorative punctuation; end statements/"
    "questions/exclamations with . / ? / ! before </d>."
)

SECTION_HELP = {
    "subject_definitions": (
        "Define every reused piece of content here — one line per label — before "
        "using it anywhere else. Explain what the label denotes, its role, and "
        "the key features to keep consistent. If a Picture or Video is only "
        "there to source another item (and won't be discussed separately later), "
        "just mention it inside that item's line instead of giving it its own card."
    ),
    "summary": (
        "One short paragraph: the bracketed task-type prefix, then a plain-English "
        "summary of the target video and how your reference labels relate to it. "
        "Don't introduce new labels here that aren't already defined above."
    ),
    "retention_analysis": RETENTION_HELP,
    "detailed_description": (
        "The heart of the prompt — visuals, actions, camera, sound, and dialogue, "
        "shot by shot, in playback order. Open with 1-2 sentences establishing the "
        "overall style before [Shot 1]. [Shot 1] has no timestamp; every later shot "
        "starts \"[Shot N] At MM:SS.mmm, ...\". Introduce each reference label in "
        "full the first time it clearly appears, then just reuse the label. Aim "
        "for roughly 350-500 words for a generation task (editing tasks scale with "
        "the source video instead, and dense dialogue can run longer)."
    ),
    "overall_soundscape": (
        "Summarize ambience and physical sound across the whole video (room tone, "
        "wind, traffic, footsteps). Leave dialogue, singing, and shot-synced sound "
        "events inside Detailed Description — don't repeat them here."
    ),
    "non_diegetic_music": (
        "Describe background score the characters themselves can't hear — audience "
        "-only music. Note instrumentation, tempo, and how it develops. If there's "
        "none, it's fine to just write \"N/A\"."
    ),
}
