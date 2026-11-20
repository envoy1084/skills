# skills

My personal agent skills. Each one is a folder in [`skills/`](skills) with a
`SKILL.md` that follows the [Agent Skills](https://agentskills.io) format, so
they work in Claude Code, Codex, and other agents that support skills.

## Skills

| Skill | Say | What it does |
|---|---|---|
| _None yet_ | | |

## Install

Clone the repo and symlink the skills into your agent's skills folder. Symlinks
mean edits in this repo take effect immediately.

```bash
git clone <repo-url> ~/Projects/Personal/skills
cd ~/Projects/Personal/skills

for skill in skills/*/; do
  ln -sfn "$PWD/$skill" ~/.claude/skills/"$(basename "$skill")"   # Claude Code
  ln -sfn "$PWD/$skill" ~/.codex/skills/"$(basename "$skill")"    # Codex
done
```

To copy them instead of linking:

```bash
cp -R skills/* ~/.claude/skills/
```

## Make them yours

These are starting points. Put personal settings in your `CLAUDE.md` or
`AGENTS.md` rather than in the skills, so you can update the skills without
losing them.

## License

[MIT](LICENSE)
