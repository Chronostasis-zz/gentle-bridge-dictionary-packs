# Gentle Bridge Dictionary Packs

Versioned, downloadable local dictionary packs for Gentle Bridge language-learning tools.

The repository contains pack schemas, deterministic builders, tests, attribution, and GitHub Actions release automation. It does not commit upstream dictionary dumps. Release assets contain normalized lexical data and remain data-only: they contain no executable code.

## Release Contract

The latest release exposes:

- `catalog.json`: available language-pair packs.
- `lex-pair-{source}-{target}.jsonl.gz`: compressed lookup records.
- `lex-pair-{source}-{target}.manifest.json`: checksum, version, attribution, and coverage.

Applications download a selected pair only after an explicit user action, verify SHA-256, import it into local IndexedDB, and perform all later lookups locally.

## Published Packs

- `ja -> en`: 839,834 indexed forms from the pinned 2026-06-25 Kaikki/Wiktionary Japanese snapshot.

The schemas and catalog support any language pair. Additional packs are published only after source licensing, normalization, deterministic-build, and lookup-quality checks pass; the catalog never claims unpublished pairs are comprehensive.

Latest release: https://github.com/Chronostasis-zz/gentle-bridge-dictionary-packs/releases/latest

## Build A Kaikki Pack

```powershell
node scripts/build-kaikki-pack.mjs `
  --input Japanese.jsonl `
  --source ja `
  --target en `
  --data-version 2026-06-25 `
  --source-url https://kaikki.org/dictionary/Japanese/ `
  --output dist
```

The GitHub workflow performs this process from a pinned upstream URL and uploads the generated assets.

## Licensing

Builder code is MIT licensed. Dictionary data retains each upstream source license and attribution. Wiktionary-derived Kaikki packs are distributed under CC BY-SA and GFDL; see [DATA_LICENSES.md](DATA_LICENSES.md).
