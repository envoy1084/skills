# Adding an app

The script does not render apps: framework generators change faster than templates. Add each app
after the workspace passes `pnpm check`, then bring it in line with the workspace.

## 1. Generate

Run the framework's own generator into `apps/<name>` with the latest version, skipping its git
init, install and linters:

- **TanStack Start**: `pnpm create @tanstack/start@latest apps/<name>` (choose no add-ons you do not
  need; skip ESLint/Prettier/Biome).
- **Next.js**: `pnpm create next-app@latest apps/<name> --ts --app --src-dir --no-eslint
  --use-pnpm --skip-install --disable-git` (add `--tailwind` if wanted).
- **Anything else**: the framework's documented `create` command, with the same skips.

## 2. Normalize

1. `package.json`: name `<scope>/<name>` (or `<name>-<app>` without a scope), `"private": true`,
   `"type": "module"`, remove its `packageManager`, `engines` and lint/format scripts. Keep the
   framework's `dev`, `build`, `start`; add
   `"lint": "oxlint -c ../../.config/oxlint.config.ts --deny-warnings ."` and
   `"typecheck": "tsc --noEmit"`.
2. Dependencies: exact latest versions. Move any version that another package also uses into the
   catalog (`catalog:`); depend on workspace packages with `workspace:*`.
3. Delete generated ESLint, Prettier and Biome configs, `.gitignore` files already covered by the
   root, lockfiles, `.vscode/` and `README` boilerplate.
4. `tsconfig.json`: extend the klarity app preset (`klarity/tsconfig/app/vite` for TanStack
   Start/Router and Vite apps, `klarity/tsconfig/app/next` for Next.js — keep the project-relative
   `include` list klarity's README shows), add `"customConditions": ["workspace-source"]` so the app
   reads workspace packages from source, and keep the framework's path aliases.
5. Lint: add an override in `.config/oxlint.config.ts` for `**/apps/<name>/**` with klarity's React
   or Next preset (`klarity/oxlint/react`, `klarity/oxlint/next`: their `plugins`, `env` and
   `rules`), and add the framework's generated files (route trees, `.next`, `.output`) to
   `ignorePatterns` and `.config/oxfmtignore`.
6. Turborepo: the root `turbo.json` already caches `.next/**` and `.output/**`. Add the app's build
   environment variables to the `build` task's `env`, never to `globalEnv`.
7. Tests: if the app has tests, add a Vitest project for it (`klarity/vitest/react` settings for
   component tests), following the `test-development` skill.
8. Remove the generator's sample comments and boilerplate content; landmines rejects prose
   comments.
9. Update `AGENTS.md` and `CONTRIBUTING.md` workspace maps.

## 3. Verify

`pnpm install`, `pnpm format`, `pnpm check`, then run the app's `dev` and `build` once. Commit as
`feat(<name>): add <framework> app`.
