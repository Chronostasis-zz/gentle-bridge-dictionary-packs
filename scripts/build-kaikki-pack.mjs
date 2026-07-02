import { createReadStream, createWriteStream, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createGzip } from 'node:zlib'
import { dirname, join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { pipeline } from 'node:stream/promises'

const options = parseArgs(process.argv.slice(2))
const input = required(options, 'input')
const sourceLanguage = required(options, 'source')
const targetLanguage = required(options, 'target')
const dataVersion = required(options, 'data-version')
const sourceUrl = required(options, 'source-url')
const outputDirectory = resolve(options.output ?? 'dist')
const packId = `lex-pair-${sourceLanguage}-${targetLanguage}`
const jsonlPath = join(outputDirectory, `${packId}.jsonl`)
const gzipPath = `${jsonlPath}.gz`
mkdirSync(dirname(jsonlPath), { recursive: true })

const entries = new Map()
const lines = createInterface({ input: createReadStream(input, { encoding: 'utf8' }), crlfDelay: Infinity })
for await (const line of lines) {
  if (!line.trim()) continue
  const raw = JSON.parse(line)
  if (raw.lang_code !== sourceLanguage || typeof raw.word !== 'string') continue
  const meanings = unique((raw.senses ?? []).flatMap((sense) => sense.glosses ?? []).map(sanitizeMeaning).filter(Boolean)).slice(0, 3)
  if (!meanings.length) continue
  const forms = unique([
    raw.word,
    ...(raw.forms ?? []).filter((form) => !form.tags?.includes('romanization')).map((form) => form.form),
  ].map(sanitizeForm).filter(Boolean))
  for (const form of forms) {
    const key = normalize(form, sourceLanguage)
    if (!key) continue
    const current = entries.get(key) ?? { key, forms: [], senses: [] }
    current.forms = unique([...current.forms, form]).slice(0, 12)
    if (!current.senses.some((sense) => sense.meanings.join('\u0000') === meanings.join('\u0000'))) {
      current.senses.push({ lemma: raw.word, pos: normalizePos(raw.pos), meanings, sourceSenseIds: (raw.senses ?? []).map((sense) => sense.id).filter(Boolean).slice(0, 8) })
    }
    current.senses = current.senses.slice(0, 8)
    entries.set(key, current)
  }
}

const output = createWriteStream(jsonlPath, { encoding: 'utf8' })
for (const entry of [...entries.values()].sort((left, right) => left.key.localeCompare(right.key))) {
  output.write(`${JSON.stringify(entry)}\n`)
}
await new Promise((resolvePromise, reject) => {
  output.end(resolvePromise)
  output.on('error', reject)
})
await pipeline(createReadStream(jsonlPath), createGzip({ level: 9 }), createWriteStream(gzipPath))

const checksumSha256 = createHash('sha256').update(readFileSync(gzipPath)).digest('hex')
const generatedAt = new Date().toISOString()
const assetName = `${packId}.jsonl.gz`
const manifest = {
  id: packId,
  schemaVersion: 1,
  dataVersion,
  sourceLanguage,
  targetLanguage,
  capabilities: ['forms', 'lemmas', 'senses', 'glosses', 'equivalents'],
  assetUrl: `https://github.com/Chronostasis-zz/gentle-bridge-dictionary-packs/releases/download/packs-v1/${assetName}`,
  sizeBytes: statSync(gzipPath).size,
  checksumSha256,
  entryCount: entries.size,
  generatedAt,
  compression: 'gzip',
  sources: [{
    id: 'kaikki-enwiktionary',
    version: dataVersion,
    url: sourceUrl,
    licenseId: 'CC-BY-SA-3.0-and-GFDL',
    attribution: 'Wiktionary contributors; structured extraction by Wiktextract/Kaikki.org',
  }],
}
writeFileSync(join(outputDirectory, `${packId}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(JSON.stringify({ ...manifest, uncompressedBytes: statSync(jsonlPath).size }, null, 2))

function parseArgs(args) {
  const result = {}
  for (let index = 0; index < args.length; index += 2) result[args[index].replace(/^--/, '')] = args[index + 1]
  return result
}

function required(values, key) {
  if (!values[key]) throw new Error(`Missing --${key}`)
  return values[key]
}

function sanitizeMeaning(value) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280) : ''
}

function sanitizeForm(value) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120) : ''
}

function normalize(value, language) {
  return value.normalize('NFKC').toLocaleLowerCase(language).replace(/[\p{P}\p{S}\s]+/gu, '')
}

function normalizePos(value) {
  const pos = String(value ?? '').toLowerCase()
  if (pos.includes('verb')) return 'VERB'
  if (pos.includes('adjective')) return 'ADJ'
  if (pos.includes('adverb')) return 'ADV'
  if (pos.includes('pronoun')) return 'PRON'
  if (pos.includes('proper')) return 'PROPN'
  if (pos.includes('particle')) return 'PART'
  if (pos.includes('interjection')) return 'INTJ'
  if (pos.includes('numeral')) return 'NUM'
  if (pos.includes('conjunction')) return 'CCONJ'
  if (pos.includes('noun')) return 'NOUN'
  return 'X'
}

function unique(values) {
  return [...new Set(values)]
}
