#!/usr/bin/env node
// FIA owner nudge — sessionStart hook.
//
// Discovers every FIA owner install in this repo (there may be more than one
// in a monorepo-of-skills layout — same discovery logic as the fia-inbox
// Skill's Step 0), fetches each one's feedback summary, and surfaces one
// merged nudge when any of them have new/needs_review items. Owner-scoped:
// it only reports on entries that have BOTH a config and the gitignored owner
// secret file, so submitters (who have neither) get nothing.
//
// Because Cursor 3.x has a confirmed bug where sessionStart additional_context
// is dropped, the reliable delivery is a generated, gitignored always-apply rules
// file (.cursor/rules/fia-inbox.generated.mdc). We ALSO print additional_context
// for forward-compat if/when that channel is fixed.
//
// Fail-open always: any error exits silently. Never block a session.

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const CWD = process.cwd();
const RULES_PATH = join(CWD, '.cursor', 'rules', 'fia-inbox.generated.mdc');

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function clearRulesFile() {
  try { if (existsSync(RULES_PATH)) rmSync(RULES_PATH); } catch { /* ignore */ }
}

// Every { skillName, config, ownerLocal } pair with BOTH files present: the
// root standard-mode layout, plus any sibling skill folder (monorepo mode).
function discoverEntries() {
  const entries = [];

  const rootConfigPath = join(CWD, 'Intelligent-Feedback-Agent-FIA', 'fia.config.json');
  const rootOwnerPath = join(CWD, 'Intelligent-Feedback-Agent-FIA', 'fia.owner.local.json');
  if (existsSync(rootConfigPath) && existsSync(rootOwnerPath)) {
    const config = readJson(rootConfigPath);
    const ownerLocal = readJson(rootOwnerPath);
    if (config && ownerLocal) entries.push({ skillName: null, config, ownerLocal });
  }

  let siblings = [];
  try { siblings = readdirSync(CWD, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch { /* ignore */ }
  for (const dir of siblings) {
    const name = dir.name;
    if (name === 'Intelligent-Feedback-Agent-FIA' || name.startsWith('.')) continue;
    const configPath = join(CWD, name, 'fia.config.json');
    const ownerPath = join(CWD, name, 'fia.owner.local.json');
    if (existsSync(configPath) && existsSync(ownerPath)) {
      const config = readJson(configPath);
      const ownerLocal = readJson(ownerPath);
      if (config && ownerLocal) entries.push({ skillName: name, config, ownerLocal });
    }
  }

  return entries;
}

async function fetchSummary(entry) {
  const toolId = entry.config?.tool_id;
  const apiBase = entry.config?.api_base;
  const readKey = entry.ownerLocal?.owner_read_key;
  const kitVersion = entry.config?.kit_version ?? '';
  if (!toolId || !apiBase || !readKey) return null;

  try {
    const url = `${apiBase}/skill/summary?tool_id=${encodeURIComponent(toolId)}&kit_version=${encodeURIComponent(kitVersion)}`;
    const res = await fetch(url, {
      headers: { 'X-Fia-Read-Key': readKey },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { skillName: entry.skillName, data };
  } catch { return null; }
}

async function main() {
  const entries = discoverEntries();
  if (!entries.length) { process.exit(0); } // no owner install(s) in this repo

  const results = (await Promise.all(entries.map(fetchSummary))).filter(Boolean);
  if (!results.length) { process.exit(0); }

  let totalNew = 0, totalNeedsReview = 0, totalRecentCount = 0;
  // kit_outdated/kit_changelog come from /skill/summary — set server-side by
  // comparing the kit_version we just reported above against FIA's current
  // KIT_VERSION (see skill-install-guide.ts).
  let kitOutdated = false;
  let changelog = '';
  const perSkillLines = [];

  for (const { skillName, data } of results) {
    const counts = data?.counts ?? {};
    totalNew += counts.new ?? 0;
    totalNeedsReview += counts.needs_review ?? 0;
    totalRecentCount += counts.total ?? 0;
    if (data?.kit_outdated) { kitOutdated = true; changelog = data?.kit_changelog ?? changelog; }

    const attention = (counts.new ?? 0) + (counts.needs_review ?? 0);
    if (attention > 0) {
      const label = skillName ? `**${skillName}**: ` : '';
      const recent = Array.isArray(data.recent) ? data.recent : [];
      const lines = recent.slice(0, 5).map((r) => {
        const flag = r.source_diverged ? ' [forked copy]' : '';
        return `  - (${r.status}) ${r.ai_type ?? 'feedback'}: ${r.ai_summary ?? '—'}${flag}`;
      });
      perSkillLines.push(
        `- ${label}${attention} item(s) need attention (new: ${counts.new ?? 0}, needs_review: ${counts.needs_review ?? 0})`,
        ...lines,
      );
    }
  }

  const totalAttention = totalNew + totalNeedsReview;

  if (!totalAttention && !kitOutdated) {
    // Nothing needing attention anywhere and kit is current — remove any stale nudge.
    clearRulesFile();
    process.exit(0);
  }

  const banner = [
    '---',
    'description: FIA feedback awaiting your review',
    'alwaysApply: true',
    '---',
    '',
    ...(totalAttention ? [`# FIA: ${totalAttention} feedback item(s) need your attention`, '', ...perSkillLines, ''] : []),
    ...(kitOutdated ? [
      '# FIA: your FIA owner kit is out of date',
      '',
      changelog ? `What's new: ${changelog}` : 'A newer version is available.',
      '',
      'Re-run the install prompt from your FIA dashboard Settings page to pick',
      'up the update.',
      '',
    ] : []),
    `New: ${totalNew} · Needs review: ${totalNeedsReview} · Total recent: ${totalRecentCount}`,
    '',
    'Run the `fia-inbox` skill (say "check feedback" or "open my FIA dashboard") to triage.',
    '',
    '_This note is auto-generated by the FIA sessionStart hook and refreshes each session._',
  ].join('\n');

  try {
    mkdirSync(dirname(RULES_PATH), { recursive: true });
    writeFileSync(RULES_PATH, banner, 'utf-8');
  } catch { /* ignore */ }

  // Forward-compat: emit additional_context too (currently dropped by Cursor 3.x bug).
  const contextText = `FIA: ${totalAttention} feedback item(s) need your review across ${results.length} install(s). Use the fia-inbox skill to triage.`;
  process.stdout.write(JSON.stringify({ additional_context: contextText }));
  process.exit(0);
}

main().catch(() => process.exit(0));
