import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const directory = resolve(process.argv[2] ?? 'dist')
const catalogPath = resolve(process.argv[3] ?? 'catalog/catalog.json')
const existing = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, 'utf8')) : { schemaVersion: 1, packs: [] }
const manifests = readdirSync(directory)
  .filter((name) => name.endsWith('.manifest.json'))
  .map((name) => JSON.parse(readFileSync(resolve(directory, name), 'utf8')))
const byId = new Map((existing.packs ?? []).map((pack) => [pack.id, pack]))
for (const manifest of manifests) byId.set(manifest.id, manifest)
const catalog = { schemaVersion: 1, generatedAt: new Date().toISOString(), packs: [...byId.values()].sort((left, right) => left.id.localeCompare(right.id)) }
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(JSON.stringify({ packCount: catalog.packs.length, catalogPath }, null, 2))
