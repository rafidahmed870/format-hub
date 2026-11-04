# Contributing to Format Hub

Thanks for your interest in improving Format Hub. This document explains how to set up the project, the conventions we follow, and how to get your changes merged.

## Code of Conduct

By participating in this project you agree to uphold the [Code of Conduct](./CODE_OF_CONDUCT.md). Please report unacceptable behaviour to the maintainer.

## Ways to contribute

- Report bugs and request features through [GitHub Issues](https://github.com/rafidahmed870/format-hub/issues).
- Improve documentation.
- Submit fixes and new features via pull requests.
- Add or refine supported formats and codecs.

## Development setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [FFmpeg binaries](./README.md#ffmpeg-setup) placed in `src-tauri/bin/`

### Getting the code

```bash
# fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/format-hub.git
cd format-hub

# add the upstream remote
git remote add upstream https://github.com/rafidahmed870/format-hub.git

# install dependencies
pnpm install
```

### Running locally

```bash
pnpm tauri dev
```

## Useful commands

| Command             | Description                             |
| ------------------- | --------------------------------------- |
| `pnpm tauri dev`    | Run the desktop app in development mode |
| `pnpm build`        | Type-check and build the frontend       |
| `pnpm tauri build`  | Build the production app and installers |
| `pnpm lint`         | Run oxlint                              |
| `pnpm lint:fix`     | Run oxlint and apply safe fixes         |
| `pnpm format`       | Format the codebase with Prettier       |
| `pnpm format:check` | Check formatting without writing files  |

## Workflow

Follow these steps to get a change merged.

### 1. Sync your local `main`

```bash
git checkout main
git pull origin main
```

If you cloned a fork, also pull from the upstream remote:

```bash
git fetch upstream
git merge upstream/main
```

### 2. Create a new branch

Never work directly on `main`. Start a branch with a descriptive name:

```bash
git checkout -b feat/batch-progress
```

See [Branch naming](#branch-naming) for the convention.

### 3. Make your changes

- Keep the branch focused on a single concern.
- Keep the frontend and the Rust backend in sync — when a command's payload changes, update the matching TypeScript types.
- Update the documentation when you change behaviour.

### 4. Format and verify

Run these and make sure they all pass before you commit:

```bash
pnpm format
pnpm lint
pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
```

`pnpm format` runs Prettier across the codebase — always run it before opening a pull request so your diff matches the project style.

A Husky `pre-commit` hook runs `pnpm format:check` and `pnpm lint` automatically on every commit. If the commit is blocked, run `pnpm format` and stage the formatted files, then commit again.

### 5. Commit and push

```bash
git add <changed-files>
git commit -m "feat(ui): show real-time conversion progress"
git push -u origin feat/batch-progress
```

Follow the [commit message convention](#commit-messages).

### 6. Open a pull request

1. Open the repository on GitHub and click **Compare & pull request** for the branch you just pushed (or go to **Pull requests → New pull request**).
2. Set **base** to `main` and **compare** to your branch.
3. Write a clear, Conventional-Commit-style title and a description that explains **why** the change is needed.
4. Reference any related issue, for example `Closes #12`.
5. Add screenshots or a short recording for user-facing UI changes.
6. Submit the pull request and respond to the review feedback.

## Commit messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Use one of the following prefixes:

| Prefix     | Use for                                                           |
| ---------- | ----------------------------------------------------------------- |
| `feat`     | A new feature                                                     |
| `fix`      | A bug fix                                                         |
| `docs`     | Documentation only changes                                        |
| `style`    | Formatting, missing semicolons, and other non-behavioural changes |
| `refactor` | A change that neither fixes a bug nor adds a feature              |
| `perf`     | A performance improvement                                         |
| `chore`    | Build tooling, dependencies, and other maintenance                |

Examples:

```
feat(ui): show real-time conversion progress
fix(formats): remove formats unsupported by ffmpeg
chore(deps): add notification plugin
```

## Branch naming

Use a short, hyphenated name prefixed by the type of change:

```
feat/<short-description>
fix/<short-description>
docs/<short-description>
chore/<short-description>
```

## Pull request guidelines

- Fill in a clear title and description that explains **why** the change is needed.
- Reference any related issue (for example, `Closes #12`).
- Keep the pull request focused on a single concern.
- Add screenshots or a short screen recording for user-facing UI changes.
- Make sure linting, type-checking, and the Rust build pass.
- Be responsive to review feedback.

## Style guidelines

- **TypeScript / React** — follow the existing component structure and keep components small and focused. Prettier and oxlint enforce formatting and lint rules.
- **Rust** — follow the existing module layout under `src-tauri/src/` (`commands`, `ffmpeg`, `fs`). Add doc comments to public functions and return `Result` with `AppError` rather than panicking.
- **Styling** — Tailwind CSS utility classes, consistent with the surrounding code.

## Reporting bugs

When filing an issue, please include:

- A clear and descriptive title.
- Steps to reproduce the behaviour.
- The expected and actual results.
- Your OS version, the app version, and the input file type and size.
- Any relevant logs or screenshots.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
