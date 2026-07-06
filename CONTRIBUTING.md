# Contributing to BeamLab

First off, thank you for considering contributing to BeamLab!

## Development Workflow

1. Create a new branch from `main`:
   ```bash
   git checkout -b feat/123-my-new-feature
   ```

2. Make your changes in the appropriate workspace.

3. Run linting and typechecking:
   ```bash
   pnpm lint
   pnpm typecheck
   ```

4. Run tests to ensure nothing is broken:
   ```bash
   pnpm test
   ```

5. Commit your changes using Conventional Commits:
   ```bash
   git commit -m "feat: add new user profile endpoint"
   ```

6. Open a Pull Request against `main`. CI will automatically run all checks.

## Monorepo Commands

- `pnpm dev`: Starts all applications in development mode using Turbo.
- `pnpm build`: Builds all applications for production.
- `pnpm test`: Runs Vitest across all packages.
