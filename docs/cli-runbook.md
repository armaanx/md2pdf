# md2pdf CLI Runbook

Operational guide for the local/offline `md2pdf` CLI and terminal studio.

## Purpose

The CLI is the local single-user product surface for this repo. It uses the shared renderer and local workspace state instead of the web app, database, Redis, or object storage.

Use it when you want to:

- render Markdown to PDF locally
- validate documents before export
- preview rendered output in a browser
- manage local imported assets
- work in the interactive terminal studio
- build a standalone current-platform CLI package

## Operating Model

The CLI is fully local and offline.

It supports two image workflows:

- managed assets imported into `.md2pdf/assets/` and referenced as `asset://<id>`
- direct relative or absolute local image paths in Markdown

It blocks remote image URLs by default.

Preview is browser-based, not terminal-native PDF rasterization.

## Prerequisites

### Developer / npm path

Required:

- Node.js 22+
- pnpm 10+

Recommended first-time setup:

```bash
corepack enable
pnpm install
pnpm --filter md2pdf build
node apps/cli/dist/index.mjs setup
```

### Standalone packaged path

Required:

- the packaged binary for the current OS

Recommended first-time setup:

```bash
md2pdf setup
```

Notes:

- the package is OS-specific
- Chromium may need to be installed on first run
- Linux targets may still need browser system libraries

## Workspace Layout

The CLI uses a local workspace directory named `.md2pdf/`.

Structure:

```text
.md2pdf/
├─ config.json
├─ assets/
├─ history.jsonl
└─ studio-preview.html
```

Files:

- `config.json`: theme preset, theme overrides, default output directory, preview settings
- `assets/`: imported managed assets
- `history.jsonl`: append-only local render/preview/validate history
- `studio-preview.html`: preview file written by `md2pdf studio`

The workspace is discovered by walking upward from the input file directory. If none exists, some commands create it automatically through `init` or `ensureWorkspace()`.

## Core Commands

## `md2pdf init [dir]`

Creates a local workspace and sample document.

Example:

```bash
md2pdf init
md2pdf init ./docs
```

Effects:

- creates `.md2pdf/config.json`
- creates `.md2pdf/assets/`
- creates `sample.md`

Use this first when starting a new local workspace.

## `md2pdf render <input.md>`

Renders Markdown to PDF synchronously.

Examples:

```bash
md2pdf render report.md
md2pdf render report.md --output ./out/report.pdf
md2pdf render report.md --theme editorial
md2pdf render report.md --theme ./.md2pdf/theme.export.json
md2pdf render report.md --open
md2pdf render report.md --watch
```

Options:

- `-o, --output <file>`: explicit output path
- `--title <title>`: document title override
- `--theme <preset-or-file>`: preset id or JSON file
- `--open`: open the generated PDF
- `--watch`: re-render on Markdown or workspace changes

Default output behavior:

- if `--output` is provided, that path is used
- otherwise, if `.md2pdf/config.json` sets `defaultOutputDir`, output goes there
- otherwise, output is written next to the input file as `<name>.pdf`

Watch mode behavior:

- watches the input Markdown file
- watches `.md2pdf/**`
- re-renders on changes until interrupted

## `md2pdf preview <input.md>`

Builds preview HTML and opens it in the browser.

Examples:

```bash
md2pdf preview report.md
md2pdf preview report.md --theme midnight
md2pdf preview report.md --watch
md2pdf preview report.md --watch --port 4310
```

Options:

- `--title <title>`
- `--theme <preset-or-file>`
- `--open`
- `--watch`
- `--port <port>`

Modes:

- normal mode: writes a temporary preview HTML file and optionally opens it
- watch mode: starts a local preview server with live refresh

Watch preview behavior:

- selects an available port, or uses `--port`, or falls back to `config.preview.port`
- opens `http://127.0.0.1:<port>`
- watches the Markdown file and workspace for changes

## `md2pdf validate <input.md>`

Runs validation only.

Examples:

```bash
md2pdf validate report.md
md2pdf validate report.md --theme graphite
```

Validation covers:

- missing markdown
- raw HTML usage
- unsupported remote image URLs
- unresolved `asset://` references
- unresolved local image paths

Exit behavior:

- success exit code if validation passes
- non-zero exit code if validation fails

This is the right command for automation, preflight checks, and CI-style local scripts.

## `md2pdf studio [input.md]`

Launches the interactive Ink terminal UI.

Examples:

```bash
md2pdf studio
md2pdf studio report.md
md2pdf studio report.md --theme sunrise
```

What it shows:

- active document path
- active theme preset
- imported managed assets
- current validation issues
- recent history entries
- current status line

Studio keys:

- `r`: render PDF
- `p`: open preview in browser
- `v`: refresh validation and workspace state
- `i`: import assets by entering comma-separated paths
- `f`: switch the current Markdown file
- `[` and `]`: cycle theme presets
- `o`: open the last rendered PDF
- `q`: quit

Prompt behavior:

- `i` opens an inline prompt for asset paths
- `f` opens an inline prompt for a Markdown path
- `Esc` cancels the prompt
- `Enter` submits the prompt

## Asset Management

## `md2pdf assets import <files...>`

Imports local files into `.md2pdf/assets/`.

Example:

```bash
md2pdf assets import ./logo.png ./diagram.png
```

Behavior:

- copies each source file into `.md2pdf/assets/`
- assigns a stable asset id
- records the asset in `.md2pdf/config.json`
- prints the resulting Markdown form like `asset://logo`

Imported assets can then be referenced in Markdown:

```md
![Logo](asset://logo)
```

Asset ID generation:

- based on sanitized source filename
- de-duplicated with numeric suffixes when needed

## Theme Management

## `md2pdf themes export [output]`

Exports the currently resolved theme as JSON.

Examples:

```bash
md2pdf themes export
md2pdf themes export ./theme.json
md2pdf themes export ./theme.json --theme noir
```

Default output path:

- `.md2pdf/theme.export.json`

Export payload:

- `presetId`
- resolved theme object

## `md2pdf themes edit`

Updates local theme-related workspace settings interactively.

Current behavior:

- prompts for a preset choice
- prompts for `defaultOutputDir`
- writes changes back to `.md2pdf/config.json`

This is intentionally lightweight. Fine-grained theme authoring still flows through exported JSON plus `--theme`.

## Runtime Setup

## `md2pdf setup`

Installs the Playwright Chromium runtime used for PDF rendering.

Example:

```bash
md2pdf setup
```

Behavior:

- resolves the local Playwright CLI
- runs `playwright install chromium`
- sets `PLAYWRIGHT_BROWSERS_PATH=0`

Use this:

- after a fresh npm install
- after unpacking a standalone binary on a new machine
- when PDF render fails because the browser runtime is missing

## Theme Resolution Rules

Theme selection order:

1. `--theme <preset-id>` if provided
2. `--theme <json-file>` if provided
3. workspace `themePreset` from `.md2pdf/config.json`
4. default preset `studio`

Supported preset ids:

- `studio`
- `editorial`
- `graphite`
- `sunrise`
- `midnight`
- `noir`
- `obsidian`
- `atelier`
- `eclipse`

JSON theme file forms accepted:

1. raw partial theme object
2. object with `presetId` plus `theme`

Example:

```json
{
  "presetId": "editorial",
  "theme": {
    "fontSize": 16,
    "accentColor": "#8B5E34"
  }
}
```

## Image Resolution Rules

Markdown image sources are handled as follows:

- `asset://<id>`: resolved from imported managed assets in `.md2pdf/assets/`
- `./relative/path.png`: resolved relative to the Markdown file
- absolute filesystem path: resolved directly
- `file:` URL: resolved directly
- `http://` or `https://`: rejected
- `data:` URL: allowed

If a local file cannot be found, validation fails with `unresolved_local_image_source`.

If a managed asset id is missing, validation fails with `unknown_asset`.

## History and Observability

Each command records local history in `.md2pdf/history.jsonl`.

Recorded operation kinds:

- `render`
- `preview`
- `validate`

Fields captured:

- input path
- output path where relevant
- title
- theme preset
- success or error status
- duration
- issue count
- optional notes

The studio reads this history and shows recent activity.

## Install and Release Workflows

## Local developer workflow

```bash
pnpm install
pnpm --filter md2pdf build
node apps/cli/dist/index.mjs --help
node apps/cli/dist/index.mjs setup
node apps/cli/dist/index.mjs init
```

## Standalone package workflow

```bash
pnpm --filter md2pdf package
apps/cli/dist/release/md2pdf.exe --help
apps/cli/dist/release/md2pdf.exe setup
```

Packaging output:

- Windows binary: `apps/cli/dist/release/md2pdf.exe`
- deployed runtime payload: `apps/cli/dist/release/app`
- SEA blob: `apps/cli/dist/md2pdf.blob`

Current packaging model:

- builds the CLI bundle
- deploys a production app payload with `pnpm deploy --legacy`
- creates a Node SEA binary for the current platform
- the binary loads the deployed app payload from `release/app`

This is a self-contained current-platform package, not a universal single-file binary.

## Recommended Run Sequences

## New workspace

```bash
md2pdf init
md2pdf setup
md2pdf assets import ./logo.png
md2pdf validate sample.md
md2pdf render sample.md --open
```

## Fast iterative authoring

```bash
md2pdf preview report.md --watch
```

Use this when you want live browser refresh while editing Markdown and workspace assets.

## Controlled export

```bash
md2pdf validate report.md
md2pdf render report.md --output ./out/report.pdf
```

Use this when you want an explicit validation gate before rendering.

## Terminal-first editing flow

```bash
md2pdf studio report.md
```

Use this when you want asset import, quick validation, render, and preview from one terminal session.

## Troubleshooting

## `Playwright CLI is not available in this installation`

Cause:

- broken install
- missing `playwright` dependency in the runtime environment

Action:

```bash
pnpm install
pnpm --filter md2pdf build
md2pdf setup
```

## Render hangs or browser startup fails

Cause:

- Chromium runtime not installed
- missing system libraries on the target machine

Action:

```bash
md2pdf setup
```

If this is a Linux target, install the libraries Playwright requires for Chromium.

## `unknown_asset`

Cause:

- the Markdown references `asset://<id>` that is not present in the workspace config

Action:

- run `md2pdf assets import ...`
- or fix the Markdown reference

## `unresolved_local_image_source`

Cause:

- local image path does not exist from the Markdown file’s point of view

Action:

- verify the relative path
- switch to an absolute path
- or import the asset and use `asset://<id>`

## `unsupported_image_source`

Cause:

- remote image URLs are intentionally blocked

Action:

- download the image locally
- import it with `md2pdf assets import`
- update Markdown to use `asset://<id>` or a local path

## Preview opens but does not update

Cause:

- preview command was run without `--watch`
- file watcher could not see changes

Action:

```bash
md2pdf preview report.md --watch
```

## Theme changes are not applied

Cause:

- command is using a different `--theme` override than the workspace preset

Action:

- remove `--theme` to use workspace defaults
- or export/edit the theme file and pass the correct file explicitly

## Operational Notes for Maintainers

Relevant implementation paths:

- CLI entry: `apps/cli/src/index.ts`
- Ink studio: `apps/cli/src/studio.tsx`
- preview server: `apps/cli/src/preview-server.ts`
- local runtime: `packages/cli-core/src/runtime.ts`
- workspace config: `packages/cli-core/src/config.ts`
- local asset import/resolution: `packages/cli-core/src/assets.ts`
- theme resolution: `packages/cli-core/src/theme.ts`
- history: `packages/cli-core/src/history.ts`
- renderer asset resolution: `packages/renderer/src/assets.ts`
- compatibility wrapper: `scripts/render-markdown-pdf.ts`
- packaging script: `scripts/build-cli-sea.mjs`

When changing command behavior, update this runbook and `docs/cli-guide.md` together.
