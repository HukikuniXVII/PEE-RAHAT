# Migration Steps — Apply New Design to Existing Project

> Step-by-step guide to migrate an existing codebase to the new UI design.
> Follow in order. Don't skip steps. Commit between phases.

---

## Step 1: First command — survey the codebase

Paste this verbatim:

```
Read CLAUDE.md, design-system.md, and ui-spec.md first.

Then survey the codebase and report:
1. Stack (framework, CSS solution, component library)
2. Directory structure (main folders)
3. Existing pages — which routes exist, which files
4. Existing UI components — list them
5. All hex color codes currently used in the codebase
6. Current font setup
7. Any state management (Redux, Zustand, Context)
8. Auth implementation if any

DO NOT change anything. Just report findings.
```

Read the response carefully. This tells you what needs special handling.

---

## Step 2: Request a migration plan

```
Based on your survey, create a migration plan with these constraints:
- Keep existing stack (don't switch frameworks)
- Don't touch business logic (auth, API calls, validation, routing)
- Phase by phase, each phase committable independently

Phases I want:
1. Setup tokens (tailwind config + Prompt font)
2. Create shared UI components (Button, Input, Card, PageBackground)
3. Refactor Landing page per ui-spec.md
4. Refactor Login page per ui-spec.md
5. Refactor Sign Up page per ui-spec.md
6. Cleanup — find leftover raw hex codes

Output the plan. Don't start executing yet.
```

Read the plan. If something looks wrong, correct it before starting:
- "Phase 2 must not modify the existing Button component. Create a new one called `<NewButton>` and migrate gradually."
- "Use the existing folder structure. Don't create new folders."

---

## Step 3: Start Phase 1

```
Start phase 1. Show me the diff before committing.
```

Claude Code will edit files → show diff → review carefully.

If good:

```
Looks good. Commit with a clear message.
```

Test immediately in a separate terminal (not inside Claude):

```bash
npm run dev
# Open browser → verify nothing is broken
```

---

## Step 4: Execute Phases 2–5 one at a time

**Critical:** Don't run multiple phases consecutively. Commit after each phase. Test after each phase.

If Claude Code does something off during a phase, push back:

| Issue | Response |
|---|---|
| Doesn't follow design-system | "Section X of design-system.md says ___, but you did ___. Fix to match." |
| Touches business logic | "Stop. Don't modify that `useAuth` hook. Only change className." |
| Recreates an existing component | "We already have Button at components/ui/. Use the existing one." |
| Adds raw hex code | "No raw hex. Use Tailwind class referencing tailwind.config.ts." |

---

## Step 5: Final audit

After all phases done:

```
Run the audit:
1. Find all raw hex codes still in component files (exclude tailwind.config and design-system.md)
2. Find all <button> elements not using the Button component
3. Find all <input> elements not using the Input component
4. List anything not compliant with design-system.md

Report only. Don't fix automatically.
```

Review the list → fix each item, or instruct Claude Code to fix all.

---

Manual test checklist:
- [ ] Login flow works end-to-end
- [ ] Sign up flow works end-to-end
- [ ] Landing page navigates correctly
- [ ] All forms validate as expected
- [ ] API calls reach correct endpoints
- [ ] Responsive on mobile (use DevTools)
- [ ] Hover states work on all buttons
- [ ] Focus states visible on all inputs

---

## Troubleshooting

### Claude Code breaks a specific page

```bash
git checkout -- path/to/broken-file.tsx   # revert one file
# or
git reset --hard HEAD~1                    # back up one commit
```

### Project stack doesn't match what CLAUDE.md assumes

Edit `CLAUDE.md` — update the "Stack" section to match reality. Then tell Claude Code:

```
I updated CLAUDE.md with the correct stack. Re-read it.
```

### Tailwind isn't used in the existing project

Decide first:

**Option A:** Add Tailwind to the project
```
Add Tailwind to this project per design-system.md section 11.
Follow the Tailwind installation guide for our framework.
```

**Option B:** Keep existing CSS solution
```
Don't add Tailwind. Convert the tokens in design-system.md section 11 to 
[CSS variables / CSS modules / styled-components] in our existing setup.
```

### Phase fails mid-way

Stop. Don't try to fix forward. Revert:

```bash
git reset --hard HEAD
```

Re-read the phase plan, identify what went wrong, then restart with clearer instructions.

---

## Golden rules

1. **One phase at a time.** Never run multiple phases in one Claude Code session.
2. **Commit between phases.** Makes revert trivial.
3. **Test after each phase.** Catch breakage early.
4. **Read every diff.** Don't blindly approve.
5. **Push back when wrong.** Claude Code will deviate — correct it immediately.
6. **Never touch business logic.** Visual layer only.
7. **Design-system.md wins all conflicts.** Even against reference images.
