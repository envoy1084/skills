# skills

My personal agent skills. Each one is a folder in [`skills/`](skills) with a
`SKILL.md` that follows the [Agent Skills](https://agentskills.io) format, so
they work in Claude Code, Codex, and other agents that support skills.

## Skills

| Skill | Say | What it does |
|---|---|---|
| `effect-development` | (automatic) | Writes Effect v4 code from the installed Effect docs and source, never from memory. |
| `effect-style` | (automatic) | Lays out files, names, imports, errors and services the way the Effect library does. |
| `jsdocs` | (automatic) | Documents public APIs in the Effect TSDoc format (`@stability`, `@category`, `@since`). |
| `test-development` | (automatic) | Writes `@effect/vitest` tests for contracts, failures and regressions. |
| `package-development` | "add a package" | Adds or publishes a workspace package with full npm metadata and a tsdown build. |
| `dependencies` | (automatic) | Pins exact latest versions, keeps the pnpm catalog for shared deps, ranges for libraries. |
| `changesets` | (automatic) | Writes changesets and picks the version bump for published packages. |

### From tstack

Copied unchanged from [t3dotgg/tstack](https://github.com/t3dotgg/tstack) under its MIT license (see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).

| Skill | Say | What it does |
|---|---|---|
| `full-send` | "full send" | Takes a change to a merged PR with nobody watching: proves it, reviews it, files it, babysits it, merges it. |
| `file-pr` | "file a PR" | Files a short PR that leads with the problem, not an inventory of changes. |
| `babysit-pr` | "babysit" | Watches a PR through CI and review bots, and fixes the real findings. |
| `leaving-pr-comments` | (automatic) | Formats comments that an agent posts on your behalf. |

Some skills call others:

- `full-send` uses `file-pr` and `babysit-pr`, and `sol-loop` from tstack (not included here).
- `file-pr` and `babysit-pr` use `leaving-pr-comments`.

## Install

```bash
npx skills add envoy1084/skills
```

### Requirements

- An authenticated [GitHub CLI](https://cli.github.com) (`gh`) for the PR skills.
- `python3` for `babysit-pr`'s `pr-wait` script.

### Developing the skills

To edit the skills and use them at the same time, clone the repo and symlink each skill into your
agent's skills folder, so edits take effect immediately:

```bash
git clone https://github.com/envoy1084/skills ~/Projects/Personal/skills
cd ~/Projects/Personal/skills

for skill in skills/*/; do
  ln -sfn "$PWD/$skill" ~/.claude/skills/"$(basename "$skill")"   # Claude Code
  ln -sfn "$PWD/$skill" ~/.codex/skills/"$(basename "$skill")"    # Codex
done
```

## Make them yours

These are starting points. Put personal settings in your `CLAUDE.md` or
`AGENTS.md` rather than in the skills, so you can update the skills without
losing them.

## License

[MIT](LICENSE)
