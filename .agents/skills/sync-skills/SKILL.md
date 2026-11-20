---
name: sync-skills
description: Syncs this repository with the skills and agent instructions installed globally on this machine (~/.agents/skills, ~/.claude/skills, ~/.codex/AGENTS.md). Use when the user says "sync skills", "sync my skills", "I installed new skills", "update the marketplace from what I have installed", or changed their global AGENTS.md. Only for the envoy1084/skills repository.
metadata:
  internal: true
---

# Sync skills

This repository installs three things: its own skills (`skills/`), external skills pinned in
`.claude-plugin/marketplace.json` (which `install.sh` also reads), and the global agent instructions
in `global/AGENTS.md`. The user installs and edits these on their machine first; this skill brings
the repository in line with what they have, so `install.sh` and the marketplace reproduce it.

## 1. Report

Run from the repository root:

```sh
node .agents/skills/sync-skills/scripts/report.mjs
```

It reads `~/.agents/.skill-lock.json` (sources and commits recorded by `npx skills`), every skill
folder in `~/.agents/skills` and `~/.claude/skills` (Claude's app-managed `synced` folder is
skipped), this repository's `skills/`, the marketplace and `ignore.json`, and prints:

| Section | Meaning | Default action |
| --- | --- | --- |
| Missing from marketplace.json | Installed from an external repo, not listed | Add it, pinned to the installed commit |
| Different commit | Listed, but installed from a newer or older commit | Move the pin to the installed commit |
| No recorded source | A skill folder with no lock entry (hand-made or copied) | Ask: copy into `skills/` as the user's own, or add to `ignore.json` |
| Listed, not installed | In the marketplace, not on this machine | Ask: remove from the marketplace, or keep |
| Own skills not installed | Informational: the user installs this repo with `install.sh` | None |
| Global instructions | Whether `~/.codex/AGENTS.md` matches `global/AGENTS.md` and `~/.claude/CLAUDE.md` links to it | Copy the machine's version into `global/AGENTS.md` |

`--json` prints the same as data.

## 2. Decide

Apply the default actions without asking. Ask in one round only about the "ask" rows, and show the
`global/AGENTS.md` diff (`diff -u global/AGENTS.md ~/.codex/AGENTS.md`) before copying it if the
change is large. When the user says to ignore a skill, add its name to `ignore.json` so the report
stops raising it.

## 3. Apply

- **External skills** live only in `.claude-plugin/marketplace.json`. Each external repo is one
  plugin:

  ```json
  {
    "name": "<short-name-for-the-collection>",
    "source": { "source": "git-subdir", "url": "<owner>/<repo>", "path": "<folder holding the skills>", "sha": "<40-char commit>" },
    "skills": ["./<skill>", "…"],
    "description": "From <owner>/<repo>: <what the collection is for>."
  }
  ```

  `path` and each `./<skill>` come from the report (`path=` and the skill folder). Keep `skills`
  sorted. A skill from a repo already listed joins that plugin; a new repo gets a new plugin. Use
  the commit the user has installed; if the report shows `no commit`, use the repo's current
  `HEAD` (`gh api repos/<owner>/<repo>/commits/HEAD --jq .sha`) and say so. Never use a branch
  name: pins keep installs reproducible.
- **Own skills**: copy the folder into `skills/<name>/` unchanged and add a row to the README's
  Skills table.
- **Global instructions**: `cp ~/.codex/AGENTS.md global/AGENTS.md` (resolve the symlink first if
  `~/.codex/AGENTS.md` already points into this repository: then there is nothing to copy).
- **README**: keep the External skills table in step with the marketplace (one row per source,
  every skill named).

`install.sh` needs no edits: it reads the marketplace.

## 4. Check for conflicts

For every added skill, compare its name and description with all skills in `skills/` and the
marketplace:

- **Same name**: the second install overwrites the first. Never allow it; ask which to keep.
- **Same job** (two skills that would trigger on the same request, such as two "stress-test this
  UI" skills): tell the user which pair overlaps and recommend one, reading both SKILL.md files.
  Prefer the one that fits the collection it belongs to (skills that route findings to each other)
  and the user's rules (landmines, Effect style).

## 5. Verify

1. `claude plugin validate ./` passes.
2. `sh -n install.sh` passes.
3. Install into a throwaway home, with the real `npx` on `PATH` (a changed `HOME` breaks mise
   shims), and count the skills:

   ```sh
   npx_dir=$(dirname "$(mise which npx 2>/dev/null || command -v npx)")
   home=$(mktemp -d)
   env HOME="$home" PATH="$npx_dir:/usr/bin:/bin" DISABLE_TELEMETRY=1 sh ./install.sh -a claude-code
   ls "$home/.claude/skills" | wc -l   # own skills + every skill listed in the marketplace
   ```

   `sync-skills` must not be among them (`metadata.internal` hides it from `npx skills`).
4. Run the report again: every section that was acted on is empty.

## 6. Commit

Commit as `chore: sync skills with global install`, listing what was added, moved or removed in the
body. Do not push unless the user asks.
