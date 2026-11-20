# envoy1084/skills

Agent skills (`skills/`), the external skills they build on (`.claude-plugin/marketplace.json`),
the interactive installer for both (`install.sh`), and a backup of the global agent instructions
(`global/AGENTS.md`).

- When the user installs or removes skills globally, or edits their global AGENTS.md, follow
  `.agents/skills/sync-skills/SKILL.md`.
- `install.sh` reads the marketplace; never list external skills anywhere else.
- Skills under `skills/` follow the [Agent Skills](https://agentskills.io) format. Test a changed
  skill on a throwaway project before committing.
- Never push without being asked.
