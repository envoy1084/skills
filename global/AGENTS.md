# Global Agent Instructions

## Git workflow

- When working inside a Git repository, create a commit after each meaningful, self-contained change.
- Use Conventional Commits (e.g. `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Before starting, inspect the working tree. When pre-existing unstaged changes exist, preserve them and commit them separately before making new changes, unless explicitly instructed not to commit.
- Never mix unrelated pre-existing changes with your implementation.

## Research workspace

When working inside a Git repository, use a `research/` folder at the repository root for planning, progress tracking, and temporary work. Create it if it does not exist:

```
research/
├── scratchpad/          # temporary work: throwaway scripts, experiments, notes, intermediate output
├── plan/
│   ├── 001-<slug>.md    # numbered, phase-wise implementation plans
│   └── 002-<slug>.md
└── progress.md          # running log of completed plans and current state
```

- `research/` is local working state and is never committed. When creating it, add `research/` to `.git/info/exclude` (not `.gitignore`), and never stage or commit anything inside it.
- Read existing `research/plan/` and `research/progress.md` before starting work, and continue from them when they are relevant.

### `scratchpad/`

- Use it for anything temporary: one-off scripts, experiments, reproductions, logs, and intermediate files.
- Never put temporary files elsewhere in the repository.
- Production code must never import or depend on anything in `scratchpad/`.

### `plan/`

- Write a plan before implementing a new project, a new feature, or any non-trivial multi-step change.
- Name plans with a zero-padded sequence number and a short slug: `001-auth-flow.md`, `002-billing-export.md`. Use the next number after the highest existing one.
- Each plan should include:
  - **Goal**: what is being built and why.
  - **Context**: relevant existing code, constraints, and assumptions.
  - **Phases**: numbered phases, each with the concrete changes, the files or modules affected, and how it will be verified.
  - **Out of scope**: what is deliberately not being done.
  - **Open questions / risks**.
- Keep the plan up to date when the approach changes during implementation.

### `progress.md`

- After each plan (or a phase of a long plan) is completed, append an entry. Newest entries go at the bottom.
- Each entry should include:
  - Date and the plan it relates to (e.g. `001-auth-flow`).
  - **Done**: what was implemented, with relevant commits.
  - **Deferred**: what was postponed and why.
  - **Issues / notes**: problems found, decisions made, skipped checks, follow-ups.
  - **Next**: the next step.

## Scope and implementation

- First inspect the relevant code, architecture, conventions, tests, and configuration before changing anything.
- Make the smallest coherent change that fully solves the requested task.
- Do not refactor unrelated code unless the refactor is required for the implementation.
- Preserve existing public APIs and behavior unless the task explicitly requires changing them.
- Follow the repository's existing naming, folder structure, formatting, error-handling, and architectural patterns.
- Do not introduce new dependencies when the problem can be solved cleanly with existing dependencies or platform APIs.
- When adding a dependency is justified, choose a maintained, focused dependency and explain why it is needed.

## File and module organization

- Keep each file focused on one clear responsibility.
- Aim to keep source files below roughly 300–500 lines. This is a guideline, not a reason to artificially split or pad files.
- Split large files by responsibility, feature, or domain rather than creating arbitrary fragments.
- Organize related code into clear folders and modules so that ownership and dependencies remain easy to understand.
- Avoid catch-all files such as `utils.ts`, `helpers.ts`, or `common.ts` when more specific module names are possible.
- Generated files, schemas, fixtures, migrations, and other naturally large declarative files may exceed this guideline.

## Reuse and abstraction

- Extract code into shared helpers, hooks, services, or components only when:
  - it is used in multiple places;
  - it represents an important domain concept; or
  - extraction materially improves readability or testability.
- Keep simple one-off logic inline when doing so is easier to read.
- Avoid generic utility layers that hide straightforward behavior.
- Prefer duplication of a few simple lines over a premature or confusing abstraction.
- When an existing shared abstraction already fits the use case, reuse it instead of creating a parallel implementation.

## Code quality

- Prefer simple, readable, and elegant code over overly abstract or theoretically perfect code.
- Write production-quality code without overengineering.
- Handle edge cases that are realistic and materially important. Do not add large amounts of logic for extremely unlikely scenarios unless the domain requires it.
- Keep control flow shallow and explicit. Prefer early returns over deeply nested conditionals.
- Use clear, domain-specific names. Avoid vague names such as `data`, `item`, `manager`, `handler`, or `process` when a more precise name is available.
- Avoid unnecessary classes, factories, wrappers, configuration layers, and indirection.
- Do not add comments that merely repeat what the code says. Add comments only to explain non-obvious reasoning, invariants, compatibility constraints, or important trade-offs.
- Remove dead code, unused imports, debug logging, commented-out implementations, and temporary workarounds before finishing.
- Do not silently swallow errors. Return, propagate, log, or translate errors at the correct architectural boundary.
- Never hard-code secrets, credentials, private keys, tokens, environment-specific identifiers, or sensitive user data.

## Testing and verification

- Add or update tests for meaningful behavior changes.
- Prioritize tests for:
  - core business logic;
  - important failure cases;
  - security-sensitive behavior;
  - regressions fixed by the change; and
  - public interfaces.
- Avoid tests that only assert implementation details or duplicate TypeScript's type checking.
- After each meaningful change, run the relevant formatter, linter, type checker, unit or integration tests, and build command, when practical.
- Fix failures caused by the implementation. Do not make unrelated repository-wide changes merely to silence pre-existing failures.
- When a required check cannot be run, clearly state which check was skipped and why.

## Documentation

- Update documentation when behavior, configuration, commands, environment variables, APIs, schemas, or architecture changes.
- Document important assumptions and non-obvious decisions close to the relevant code.
- Keep documentation concise and synchronized with the actual implementation.
- Do not generate large explanatory documents unless requested.
