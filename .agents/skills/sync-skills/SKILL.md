---
name: sync-skills
description: Syncs this repository with the skills and agent instructions installed globally on this machine (~/.agents/skills, ~/.claude/skills, ~/.codex/AGENTS.md) by updating vendor/vendor.json, skills/ and global/AGENTS.md. Use when the user says "sync skills", "sync my skills", "I installed new skills", "update the vendor list from what I have installed", or changed their global AGENTS.md. Only for the envoy1084/skills repository.
metadata:
  internal: true
---

# Sync skills

`npx skills add envoy1084/skills` installs everything this repository holds:

- `skills/`: the user's own skills.
- `vendor/<collection>/skills/`: external skills, copied unchanged at a pinned commit by
  `pnpm sync` from the list in `vendor/vendor.json`. Never edit `vendor/` by hand.
- `.claude-plugin/marketplace.json`: the same, as Claude Code plugins (`pnpm sync` writes the
  external entries).

`global/AGENTS.md` is a backup of the user's global agent instructions; nothing installs it.

The user installs skills on their machine first. This skill makes the repository match: it edits
`vendor/vendor.json` (and `skills/`, `ignore.json`, `global/AGENTS.md`), then lets `pnpm sync` do the
copying.

## 1. Report

```sh
pnpm install   # once
pnpm report    # or: pnpm report --json
```

| Section | Meaning | Default action |
| --- | --- | --- |
| Installed globally, not vendored | Installed from an external repo, missing from `vendor/vendor.json` | Add it at the installed commit |
| Different commit than vendored | The user installed a newer (or older) version | Move the collection's `commit` to the installed one |
| No recorded source | A skill folder with no lock entry (hand-made or copied) | Ask: copy into `skills/` as the user's own, or add to `ignore.json` |
| In this repository, not installed globally | Vendored or own skills the user does not have installed | Ask before removing a vendored skill; own skills are expected here |
| Global instructions | Whether `~/.codex/AGENTS.md` matches `global/AGENTS.md` | Copy `~/.codex/AGENTS.md` over `global/AGENTS.md` |

Apply default actions without asking. Ask about the "ask" rows in one round. Show
`diff -u global/AGENTS.md ~/.codex/AGENTS.md` before copying when the change is large. When the
user says to ignore a skill, add it to `ignore.json` so the report stops raising it.

## 2. Edit `vendor/vendor.json`

Each collection is one external repository at one commit:

```json
{
  "name": "<kebab-case name for the collection>",
  "repo": "<owner>/<repo>",
  "commit": "<40-character commit>",
  "path": "<folder in that repo that holds the skill folders>",
  "skills": ["<skill>", "…"],
  "description": "From <owner>/<repo>: <what the collection is for>."
}
```

- `repo`, `commit` and `path` come from the report. A skill from a repository already listed joins
  that collection; if its installed commit differs from the collection's, the whole collection
  moves to the newer commit (one commit per collection), and the other skills come along.
- When the report shows `no commit`, use the repository's current `HEAD`
  (`gh api repos/<owner>/<repo>/commits/HEAD --jq .sha`) and say so. Never use a branch name.
- Keep `skills` sorted. Skill names must be unique across all collections and `skills/`;
  `pnpm sync` rejects duplicates.
- Only vendor repositories with a LICENSE; `pnpm sync` refuses others.

Own skills: copy the folder into `skills/<name>/` unchanged and add a README row.

## 3. Sync

```sh
pnpm sync
```

It downloads each collection at its commit, copies exactly the listed skills into
`vendor/<collection>/skills/` with the upstream LICENSE and a SOURCE.md, deletes collections no
longer listed, and rewrites the external plugins in `.claude-plugin/marketplace.json`.

## 4. Check for conflicts

For every added skill, read its SKILL.md and compare it with the other skills:

- **Same name**: `pnpm sync` fails. Ask which one to keep.
- **Same job** (two skills that would trigger on the same request): tell the user which pair
  overlaps and recommend one. Prefer the one that fits its collection (skills that hand work to
  each other) and the user's rules (landmines, Effect style).

## 5. Verify

1. `pnpm check`: format, lint, typecheck, and `pnpm sync --check` (vendor/ matches the pinned
   commits byte for byte).
2. `claude plugin validate ./`.
3. `npx skills add "$PWD" --list` lists every own and vendored skill once, and not `sync-skills`
   (its `metadata.internal` hides it).
4. `pnpm report` again: every section that was acted on is empty.

Update the README's External skills table to match `vendor/vendor.json`.

## 6. Commit

Commit as `chore: sync skills with global install`, listing what was added, moved or removed in the
body. Do not push unless the user asks.
