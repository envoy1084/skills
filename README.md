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

Skills from other repositories, copied unchanged into [`vendor/`](vendor) at a pinned commit, each
with its upstream license and a `SOURCE.md` saying where it came from. They install together with
the skills above.

| Source | Skills | For |
|---|---|---|
| [t3dotgg/tstack](https://github.com/t3dotgg/tstack) | `file-pr`, `babysit-pr`, `leaving-pr-comments` | Filing PRs, driving them through CI and review |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | `animation-performance`, `animation-vocabulary`, `apple-design`, `ask-sonner`, `choreograph`, `find-animation-opportunities`, `gestures`, `improve-animations`, `learn-taste`, `pick-ui-library`, `remove-animations`, `review-animations` | Specialised motion: choreography, gestures, performance, reviews |
| [jakubkrehel/skills](https://github.com/jakubkrehel/skills) | `better-accessibility`, `better-colors`, `better-interface`, `better-layout`, `better-motion`, `better-typography`, `better-ui`, `better-writing`, `break`, `build-design`, `explain-interface`, `interface-review`, `variant` | Interface quality |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | `find-skills` | Finding more skills |
| [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack) (pstack) | `benchmark-checklist`, `blast-radius`, `correct`, `create-formal-verification-skill`, `maintain-formal-verification-skill`, `tdd`, `technical-writing`, `unslop`, `why` | Proving changes safe, turning repeated mistakes into checks, regression-first fixes, benchmarks, formal verification, technical writing. Run them by name (`/blast-radius`); they do not trigger on their own. |

Where two collections cover the same job, one is kept: `break` over `break-ui`, `variant` over
`prototype`, `better-motion` over `animate`, and `better-interface`, `interface-review` and
`better-ui` over `emil-design-eng` and `ask-emil`. jakubkrehel's skills hand work to each other, so
that collection stays whole.

## Install

```bash
npx skills add envoy1084/skills
```

The `skills` CLI asks which skills, where (globally or this project) and for which agents. To take
everything without questions: `npx skills add envoy1084/skills --skill '*' -g -y -a claude-code -a codex`
(name your agents; without `-a`, a machine with no agent folders gets all 79 agents).

### Claude Code plugins

```bash
/plugin marketplace add envoy1084/skills
/plugin install envoy-skills@envoy-skills
/plugin install tstack-pr@envoy-skills
/plugin install emil-design-engineering@envoy-skills
/plugin install interfaces@envoy-skills
/plugin install find-skills@envoy-skills
/plugin install pstack@envoy-skills
```

Each collection is its own plugin. Third-party marketplaces do not auto-update; run
`claude plugin marketplace update envoy-skills` after this repository changes.

### Requirements

- An authenticated [GitHub CLI](https://cli.github.com) (`gh`) for the PR skills.
- `python3` for `babysit-pr`'s `pr-wait` script.

## Global agent instructions

[`global/AGENTS.md`](global/AGENTS.md) is a backup of my global agent instructions
(`~/.codex/AGENTS.md`, with `~/.claude/CLAUDE.md` linked to it). Nothing installs it.

## Developing

The repository is a pnpm workspace with one Effect v4 tool, [`tools/cli`](tools/cli) (`skills-dev`):

```bash
pnpm install
pnpm sync           # copy the skills listed in vendor/vendor.json into vendor/, update the marketplace
pnpm sync --check   # fail if vendor/ differs from the pinned commits
pnpm report         # compare skills installed on this machine with this repository
pnpm check          # format, lint, typecheck and sync --check
```

To bring in skills you installed globally, ask an agent in this repository to "sync skills": the
repository-only `sync-skills` skill (`.agents/skills`) reads `pnpm report`, edits
`vendor/vendor.json` and runs `pnpm sync`. Never edit `vendor/` by hand.

To use your own skills while editing them, symlink them into your agent's skills folder:

```bash
for skill in skills/*/; do
  ln -sfn "$PWD/$skill" ~/.claude/skills/"$(basename "$skill")"   # Claude Code
  ln -sfn "$PWD/$skill" ~/.agents/skills/"$(basename "$skill")"   # Codex and others
done
```

## Make them yours

These are starting points. Put personal settings in your `CLAUDE.md` or
`AGENTS.md` rather than in the skills, so you can update the skills without
losing them.

## License

[MIT](LICENSE)
