import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { gunzipSync } from 'node:zlib'

test('builds deterministic compact lexical records with provenance', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gentle-bridge-pack-'))
  const input = join(directory, 'input.jsonl')
  writeFileSync(input, `${JSON.stringify({ word: 'ここ', lang_code: 'ja', pos: 'noun', forms: [{ form: '此処', tags: ['canonical'] }], senses: [{ id: 'sense-here', glosses: ['here', 'this place'] }] })}\n`)
  const result = spawnSync(process.execPath, ['scripts/build-kaikki-pack.mjs', '--input', input, '--source', 'ja', '--target', 'en', '--data-version', 'test', '--source-url', 'https://example.test/source', '--output', directory], { cwd: process.cwd(), encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const lines = gunzipSync(readFileSync(join(directory, 'lex-pair-ja-en.jsonl.gz'))).toString('utf8').trim().split('\n').map(JSON.parse)
  assert.equal(lines.length, 2)
  assert.ok(lines.some((entry) => entry.key === 'ここ' && entry.senses[0].meanings[0] === 'here'))
  const manifest = JSON.parse(readFileSync(join(directory, 'lex-pair-ja-en.manifest.json'), 'utf8'))
  assert.equal(manifest.entryCount, 2)
  assert.match(manifest.checksumSha256, /^[a-f0-9]{64}$/)
})
