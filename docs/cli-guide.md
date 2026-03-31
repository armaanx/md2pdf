# md2pdf CLI

Local offline command-line interface for the `md2pdf` renderer and workspace runtime.

For the full operator-style runbook, see [docs/cli-runbook.md](C:/dev/md2pdf/docs/cli-runbook.md).

## Workspace

The CLI stores local state in `.md2pdf/`:

- `config.json`: theme preset, theme overrides, preview defaults
- `assets/`: imported managed assets referenced as `asset://<id>`
- `history.jsonl`: recent render, preview, and validation activity

## Commands

### Render

```bash
md2pdf render report.md
md2pdf render report.md --output ./out/report.pdf --open
md2pdf render report.md --watch
```

### Preview

```bash
md2pdf preview report.md
md2pdf preview report.md --watch --open
```

### Validate

```bash
md2pdf validate report.md
```

### Studio

```bash
md2pdf studio report.md
```

Studio shortcuts:

- `r`: render PDF
- `p`: open preview
- `v`: refresh validation
- `i`: import assets
- `f`: switch markdown file
- `[` and `]`: cycle theme presets
- `o`: open the last rendered PDF
- `q`: quit

### Workspace setup

```bash
md2pdf init
md2pdf assets import ./logo.png ./diagram.png
md2pdf themes export
md2pdf themes edit
md2pdf setup
```

## Packaging

Build the npm/developer bundle:

```bash
pnpm --filter md2pdf build
```

Build the current-platform standalone release:

```bash
pnpm --filter md2pdf package
```

The release command creates:

- `apps/cli/dist/release/md2pdf.exe` on Windows
- a deployed app payload under `apps/cli/dist/release/app`

## Notes

- Relative local image paths are resolved automatically for offline preview and export.
- Managed assets imported into `.md2pdf/assets/` can be referenced as `asset://<id>`.
- Remote image URLs remain blocked by default.
