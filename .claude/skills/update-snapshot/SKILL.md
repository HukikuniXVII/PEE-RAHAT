---
name: update-snapshot
description: Use when the user asks to refresh, update, or regenerate PROJECT_SNAPSHOT.md, or says "snapshot" in the context of project documentation. Walks an 8-section playbook that re-derives stack versions, folder structure, design tokens, route table, backend modules, shared types, and MVP coverage from the current repo state.
---

# update-snapshot

Refresh `PROJECT_SNAPSHOT.md` at the repo root by re-deriving every auto-discoverable section from the live codebase. Hand-curated commentary is preserved; everything else is recomputed.

## When this skill applies

Trigger phrases that should fire this skill:

- `/update-snapshot`
- "refresh the snapshot" / "update the project snapshot" / "regenerate PROJECT_SNAPSHOT.md"
- Any natural request that names `PROJECT_SNAPSHOT.md` and an update verb

## Pre-flight

Before doing anything else, confirm we're inside the PEE-RAHAT repo:

```bash
git rev-parse --show-toplevel
```

The path must end with `/PEE-RAHAT`. If not, stop and tell the user:
> This skill only runs inside the PEE-RAHAT repository. Current repo root: `<path>`.

## Canonical template

The output `PROJECT_SNAPSHOT.md` always has **exactly these 8 H2 sections, in this order**, plus a header. Section titles are fixed — never rename them.

```
# PEE-RAHAT — Project Snapshot
> Last updated: <YYYY-MM-DD>

## 1. Stack
## 2. Folder Structure
## 3. Design System
## 4. Routes / Screens
## 5. Load-Bearing Modules
## 6. State & Data
## 7. Inconsistencies & Fragility
## 8. MVP Feature Coverage
```

Every section follows the `Source:` rule below — it is the single source of truth for that section's contents.

## Source-of-truth table

| Section | Read these |
|---|---|
| Header date | `currentDate` value from the conversation context |
| 1. Stack | `package.json`, `apps/api/package.json`, `apps/web/package.json`, `turbo.json`, `pnpm-workspace.yaml`, `docker-compose.yml`, `render.yaml` |
| 2. Folder Structure | `ls -la` of repo root + `find apps packages -maxdepth 3 -type d -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.next/*"` |
| 3. Design System | `packages/config/tailwind/preset.ts` (embed verbatim in a fenced ```ts block) + `ls packages/ui/src/components/` |
| 4. Routes / Screens | `find apps/web/app -name "page.tsx" -not -path "*/node_modules/*"` — convert each path to its URL route (strip `apps/web/app`, strip `/page.tsx`, treat `[id]` as `:id`, treat `(group)/` as transparent) |
| 5. Load-Bearing Modules | `find apps/api/src -name "*.module.ts"` + `find apps/api/src -name "*.service.ts"` |
| 6. State & Data | `ls packages/types/src/*.ts`, then `grep -hE "^export (type\|interface\|class\|const\|enum) " packages/types/src/*.ts` to list exported domain names |
| 7. Inconsistencies & Fragility (auto) | `grep -rnE "#[0-9A-Fa-f]{6}" apps/web/app apps/web/components --include="*.tsx"` (stray hex), `find apps packages -name "*.tsx" -size +500c` (large files), `grep -rn "TODO\\|FIXME" apps packages --include="*.ts" --include="*.tsx" \| wc -l` (todo count) |
| 8. MVP Feature Coverage (auto) | parse `requirements.md` for IDs matching regex `FR-[A-Z]{2,}-[0-9]+`; cross-reference `git log --grep="FR-"` and `grep -rE "FR-[A-Z]{2,}-[0-9]+" apps packages --include="*.ts" --include="*.tsx"` |

## Automation playbook

Follow these steps **in order**:

### Step 1 — Read existing snapshot

Read `PROJECT_SNAPSHOT.md`. From the current file extract:

- The header date (so the change summary can report it as "previous")
- Hand-curated content under **§7 Inconsistencies & Fragility** — everything above any `## Auto-detected` line
- Hand-curated content under **§8 MVP Feature Coverage** — same rule

These hand-curated blocks must survive the rewrite untouched.

### Step 2 — Gather signals

Run, in this order, the commands from the source-of-truth table for sections 1–8. Capture their output into memory. Run independent reads in parallel where possible.

For §3 Design System: read `packages/config/tailwind/preset.ts` and embed its **full** content verbatim inside a fenced ```ts block. This is intentional — a future preset edit must show up cleanly in `git diff` of the snapshot.

For §4 Routes / Screens: render a Markdown table with columns `Route | File | Notes`. Routes are derived from file paths; `Notes` stays blank unless the path is a dynamic segment (`[id]`) — then note "dynamic param: `id`".

For §6 State & Data: produce a bullet list grouped by file name. Each bullet shows the exported symbol name and kind (type / interface / class / const / enum).

### Step 3 — Render sections

For each section, write the rendered output into the template skeleton. Sections 7 and 8 get special handling:

- Write the preserved hand-curated block first (verbatim).
- Then a horizontal rule (`---`).
- Then a sub-heading `### Auto-detected (regenerated <date>)`.
- Then the auto-detected findings.

### Step 4 — Update header date

Replace the `> Last updated:` line with today's date (use the `currentDate` value from the conversation context).

### Step 5 — Write the file

Use the `Write` tool to overwrite `/Users/kamin/Documents/GitHub/PEE-RAHAT/PROJECT_SNAPSHOT.md`.

### Step 6 — Change summary

Print to the user a 5–10 line summary in this shape:

```
PROJECT_SNAPSHOT.md updated (2026-05-20 → <today>)
  §1 Stack:       Next 14.2 → <new>, NestJS unchanged
  §3 Design:      preset.ts (+12 / -3 lines), components: +Foo, -Bar
  §4 Routes:      <N> total (+<new>, -<gone>)
  §5 Modules:     +<new>.module.ts
  §6 Types:       +<new exported names>
  §7 Auto:        <X> stray hex, <Y> TODOs, <Z> large files
  §8 Coverage:    <done>/<total> FR-IDs referenced in code
```

Always include a section line, even when nothing changed (`§X: no changes`). Keep it tight — this lives in chat output, not the file.

## Rules and rails

- **Never delete** the hand-curated block of §7 or §8. If you can't find a clear divider, assume the entire current section is hand-curated and append `## Auto-detected` below it.
- **Never invent versions or paths**. If a file or command would have informed a section but is missing/empty, write "_(not detected)_" in that field rather than guessing.
- **Section order is fixed**. Don't reorder, even if a new section type seems useful — propose it to the user separately instead.
- **One write per run**. Don't make multiple `Write` calls to the same file; assemble everything in memory and write once.
- **No code edits**. Only `PROJECT_SNAPSHOT.md` may change. If you find drift bad enough that it would warrant a code fix (e.g. a route file that imports nothing), surface it in the chat summary — do not fix it from inside this skill.

## Verification (for the human invoking)

After a run:

1. `git diff PROJECT_SNAPSHOT.md` shows only intended sections moving.
2. Header date matches today.
3. Hand-curated bullets in §7 and §8 are still present, above the `### Auto-detected` divider.
4. Running the skill again with no other changes produces a zero-line diff.
