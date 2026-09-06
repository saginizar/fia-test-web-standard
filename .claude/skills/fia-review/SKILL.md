---
name: fia-review
description: >-
  For the TOOL OWNER only. Looks up ONE specific feedback item — by its FIA
  feedback ID or a pasted FIA dashboard link — and answers questions about it,
  including showing the full conversation transcript verbatim on request. Use
  when the owner says things like "review feedback <id>", "look at feedback
  item <id>", "show me the transcript for <id>", "assess the fix for this
  feedback", or pastes a FIA dashboard feedback link. Read-only and owner-facing
  — it never changes feedback status (that happens in the dashboard) and never
  submits feedback (that's fia-feedback).
---

# FIA Review — investigate one feedback item

Look up a single feedback item and answer the owner's questions about it —
including showing the full transcript verbatim if asked. FIA only ever hands
back feedback data here. If the owner then asks you to assess a fix (complexity,
value, what has to change), that is you reasoning about your own codebase in
this same session, exactly like any other question about this repo — FIA has
no part in that step and never receives or sees any code.

## Step 0 — Discover installed skill(s)

This repo may have FIA owner files for more than one skill (monorepo-of-skills
layout). Use the same discovery as the `fia-inbox` Skill:

First, determine the repo root: run `git rev-parse --show-toplevel` (works on
Windows, macOS, and Linux). Use that absolute path for all file checks below —
never assume the current working directory is the repo root.

1. If `Intelligent-Feedback-Agent-FIA/fia.config.json` exists at the repo root,
   that's one entry.
2. For every sibling folder at the repo root with its own
   `<name>/fia.config.json` plus a matching `<name>/fia.owner.local.json`,
   that's another entry.
3. Build a list of `{ tool_id, api_base, owner_read_key }` from entries that
   have both files.

If the list is empty, tell the owner this Skill isn't set up for in-Cursor
review yet (they need the owner kit — see the `fia-inbox` Skill's install) and
stop. Never invent a key or proceed without one.

## Step 1 — Identify which feedback item

Find a `feedback_id` in the owner's message. It may arrive as:

- A bare ID they typed or pasted (e.g. "review feedback 3f9a1c2e-...").
- A FIA dashboard link, e.g. `<dashboard_url>/feedback/<feedback_id>?tool_id=...`
  — extract the ID from the path segment right after `/feedback/`.

If no feedback ID appears anywhere in their message, ask for it (or ask them to
paste the dashboard link) — never guess, and never reuse an ID from earlier in
the conversation unless they're clearly still talking about the same item.

## Step 2 — Fetch the item

On Windows, PowerShell aliases `curl` to `Invoke-WebRequest`, which rejects
curl's flags — always call `curl.exe` explicitly:

```bash
curl.exe -sS "<api_base>/skill/feedback?tool_id=<tool_id>&feedback_id=<feedback_id>" \
  -H "X-Fia-Read-Key: <owner_read_key>"
```

If Step 0 found only one entry, use it directly. If it found more than one,
try each entry's `tool_id`/`owner_read_key` in turn — stop at the first one
that does NOT return 404. (This ID is only meaningful scoped to a `tool_id`,
and asking the owner which skill first would defeat the point of pasting a
bare ID or link.)

If every entry returns 404, tell the owner plainly that this ID wasn't found in
any installed skill in this repo (it may be mistyped) — do not fabricate a result.

## Step 3 — Answer the owner's questions

The response's `feedback` object has the full record: `status`, `ai_type`,
`ai_summary`, `ai_scores`, `ai_recommendation`, `ai_rationale`, submitter info,
and the complete `raw_transcript`. Use it to answer whatever the owner asks:

- "Show me the transcript" — show it verbatim, every message in order,
labeled by role. Do not summarize it instead of showing it.
- General questions ("what's this about?", "how urgent is it?", "who
reported this?") — answer directly from the record; do not add anything it
doesn't say.
- "Assess the fix" / complexity / value / what has to change — this is now
an ordinary question about this repo's own code. Read and reason about the
codebase exactly as you would for any other request in this workspace. FIA
is out of the picture at this point — it already gave you the feedback data
in Step 2, and never sees or receives any code from you.

## Never do

- Never change `status`, `ai_type`, or any other field from here — that only
happens in the dashboard.
- Never fabricate transcript content, scores, or details not present in the
Step 2 response.
- Never send `owner_read_key` anywhere except the `X-Fia-Read-Key` header above.
