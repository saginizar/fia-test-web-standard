---
name: fia-inbox
description: >-
  For the TOOL OWNER only. Shows a quick summary of feedback collected by FIA for
  this tool and opens the FIA dashboard. Use when the owner says "check feedback",
  "any new feedback", "open my FIA dashboard", "fia inbox", or runs /fia-inbox.
  This is owner-facing — do not use it to submit feedback (that's fia-feedback).
---

# FIA Inbox — owner view

Show the tool owner what feedback has come in, and open the full dashboard.

**Cross-shell command rules (apply to every command in this Skill, every time
it runs — not just at install):** run ONE command per call, never chain with
`&&`. On Windows, PowerShell aliases `curl` to `Invoke-WebRequest` (which
rejects curl's flags) — always call `curl.exe` explicitly. Check whether a
file exists with `Test-Path <path>` (Windows) or `[ -f <path> ]`
(macOS/Linux) — never `ls | grep`, `head`, or other Unix-only pipes.

## Step 0 — Discover installed skill(s)

This repo may have FIA owner files for more than one skill (monorepo-of-skills
layout). Find every installed skill before showing anything:

First, determine the repo root: run `git rev-parse --show-toplevel` alone
(works on Windows, macOS, and Linux — do not chain it with `cd`). Use that
absolute path for all file checks below — never assume the current working
directory is the repo root.

1. Check whether `<repo-root>/Intelligent-Feedback-Agent-FIA/fia.config.json`
   exists — `Test-Path <path>` on Windows, `[ -f <path> ]` on macOS/Linux. If
   it exists, that's one entry (standard-mode install).
2. For every sibling folder at the repo root, check the same way whether it
   has its own `<name>/fia.config.json` AND `<name>/fia.owner.local.json` —
   if BOTH exist, that's another entry (monorepo-mode install for that skill).
3. Build a list of `{ skill_name, tool_id, api_base, dashboard_url,
   owner_read_key, kit_version }` from whichever entries have BOTH a config
   and a secret file present (`kit_version` comes from that entry's own
   `fia.config.json`). A config with no matching secret belongs to a
   submitter-only install and is never yours to summarize.

If the list is empty: tell the owner this Skill isn't set up for in-editor
review yet — they need to re-run the install prompt with their read key — and
stop.

If exactly one entry was found, everything below behaves exactly as before
(single-tool summary). If more than one was found, run Step 1 for EACH entry
and merge the results into one combined view, tagged by skill name — never
ask the owner which skill they meant.

## Step 1 — Quick summary

For EACH entry from Step 0, call the read-only summary endpoint (the key goes
in a header, never the URL). On Windows, PowerShell aliases `curl` to
`Invoke-WebRequest`, which rejects curl's flags — always call `curl.exe`
explicitly:

```bash
curl.exe -sS "<api_base>/skill/summary?tool_id=<tool_id>&kit_version=<kit_version>" -H "X-Fia-Read-Key: <owner_read_key>"
```

Always include `&kit_version=<kit_version>` from that entry's own config —
omitting it makes the response always look outdated (the backend can't tell
the difference between "no kit_version reported" and "genuinely outdated").

Merge `recent` from every entry into ONE compact markdown table, newest first
across all of them — do not fall back to a bullet list, and never print one
table per skill:

- Exactly one entry: same shape as before —

| ID | Status | Type | Summary | Date | Link |
| --- | --- | --- | --- | --- | --- |

- More than one entry: add a leading Skill column (that entry's
`skill_name` from Step 0; for the root/standard-mode entry mixed in with
monorepo entries, label it with this repo's own folder name):

| Skill | ID | Status | Type | Summary | Date | Link |
| --- | --- | --- | --- | --- | --- | --- |

- ID — the item's `feedback_id`, in full. Not truncated — the owner may need
to paste it into the `fia-review` Skill later to dig into that specific item.
- Status / Type — `status` / `ai_type` as-is (`ai_type` may be empty if
analysis hasn't finished yet — show `—`).
- Summary — `ai_summary`, or "Analysing…" if not yet set.
- Date — `created_at`, formatted naturally (e.g. "Jul 23").
- Link — a direct dashboard link to that item, built from fields already in
the response (no extra API call needed) as:
`<dashboard_url>/feedback/<feedback_id>?tool_id=<tool_id>&sk=<created_at>%23<feedback_id>`
— note `%23` (URL-encoded `#`) joining `created_at` and `feedback_id` for `sk`.
Use THAT entry's own `dashboard_url`/`tool_id` — never mix entries.

After the table:

- Counts line: sum `total`/`new`/`needs_review` across every entry (with more
than one entry, you may add a short per-skill breakdown too).
- If any item has `source_diverged: true`, note it: the submitter's copy differs
from your canonical repo — the feedback may be about a fork.
- If an item has a `skill_version` older than your current HEAD, you may want to
check whether it's already fixed before acting. Do not tell submitters
anything — this is your call.
- If any entry's response has `kit_outdated: true`, mention once (not per
skill) that a newer kit is available, using its `kit_changelog` text —
since `kit_version` is now always sent, this only fires when genuinely true.
- Close with: "To see more, or to triage (accept/decline/defer/complete), open
the dashboard." Also mention the `fia-review` Skill for digging into one item
by ID — full transcript included.

This table only ever reflects what `/skill/summary` returned per entry — the
10 most recent items per skill, not necessarily every `new` one there. Do not
invent rows, and do not claim this is the complete list of `new` items if any
entry's `counts.new` is larger than what's actually shown for it.

## Step 2 — Open the dashboard

Offer to open the FIA dashboard, deep-linked directly to a tool's feedback
list (not the home/tool-picker page), for triage (accept / decline / defer /
complete). Build the URL by appending `?tool_id=<tool_id>` to that entry's
`dashboard_url`:

- Windows: `Start-Process "<dashboard_url>?tool_id=<tool_id>"`
- macOS: `open "<dashboard_url>?tool_id=<tool_id>"`
- Linux: `xdg-open "<dashboard_url>?tool_id=<tool_id>"`

If Step 0 found only one entry, use it directly. If it found more than one,
ask which skill's dashboard to open — this is a one-off UI action, not part of
the feedback-summary flow above, so asking here is fine.

The dashboard requires the owner's normal FIA (Cognito) sign-in — that is
separate from the read key used above.

## Never do

- Never commit or print `owner_read_key` back into any tracked file.
- Never take triage actions (accept/decline) from here — those happen in the
dashboard. This skill is read-only plus "open dashboard".
