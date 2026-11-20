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
| `scaffold-workspace` | "scaffold a new project" | Creates a pnpm + Turborepo + TS 7 + Effect v4 monorepo with klarity, landmines, hardened GitHub workflows and, for npm packages, verified provenance releases. |

## External skills

The installers below also add skills from other repositories, pinned to a tested commit. They are
not copied into this repository.

| Source | Skills | For |
|---|---|---|
| [t3dotgg/tstack](https://github.com/t3dotgg/tstack) | `file-pr`, `babysit-pr`, `leaving-pr-comments` | Filing PRs, driving them through CI and review |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | `animate`, `animation-performance`, `animation-vocabulary`, `apple-design`, `ask-emil`, `ask-sonner`, `break-ui`, `choreograph`, `emil-design-eng`, `find-animation-opportunities`, `gestures`, `improve-animations`, `learn-taste`, `pick-ui-library`, `prototype`, `remove-animations`, `review-animations` | Animation and design-engineering polish |
| [jakubkrehel/skills](https://github.com/jakubkrehel/skills) | `better-accessibility`, `better-colors`, `better-interface`, `better-layout`, `better-motion`, `better-typography`, `better-ui`, `better-writing`, `break`, `build-design`, `explain-interface`, `interface-review`, `variant` | Interface quality |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | `find-skills` | Finding more skills |

The list lives in two places that must stay in sync: [`install.sh`](install.sh) and
[`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json). To update a source, change
its commit in both, then run `claude plugin validate ./`.

## Install

### Every agent (Claude Code, Codex, Cursor, …)

```bash
curl -fsSL https://raw.githubusercontent.com/envoy1084/skills/main/install.sh | sh
```

This runs `npx skills add` for this repository and each external source, globally and without
prompts. Extra flags go to every `skills add`, for example `sh install.sh -a claude-code -a codex`.
To install only this repository's skills: `npx skills add envoy1084/skills`.

### Claude Code plugins

```bash
/plugin marketplace add envoy1084/skills
/plugin install envoy-skills@envoy-skills
/plugin install tstack-pr@envoy-skills
/plugin install emil-design-engineering@envoy-skills
/plugin install interfaces@envoy-skills
/plugin install find-skills@envoy-skills
```

Each source is its own plugin, so you can install only the ones you want. Third-party marketplaces
do not auto-update; run `claude plugin marketplace update envoy-skills` after this repository
changes.

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

Test `install.sh` against a local clone with `SKILLS_SOURCE=$PWD sh install.sh`.

## Make them yours

These are starting points. Put personal settings in your `CLAUDE.md` or
`AGENTS.md` rather than in the skills, so you can update the skills without
losing them.

## License

[MIT](LICENSE)
