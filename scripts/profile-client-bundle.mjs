#!/usr/bin/env node

import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BASE64_VALUES = new Map(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    .split('')
    .map((character, index) => [character, index]),
)

function decodeVlq(segment) {
  const values = []
  let value = 0
  let shift = 0

  for (const character of segment) {
    const digit = BASE64_VALUES.get(character)
    if (digit === undefined) {
      throw new Error(`Invalid source-map VLQ character: ${character}`)
    }
    value += (digit & 31) << shift
    if (digit & 32) {
      shift += 5
      continue
    }
    const negative = value & 1
    values.push(negative ? -(value >> 1) : value >> 1)
    value = 0
    shift = 0
  }

  if (shift !== 0) {
    throw new Error('Incomplete source-map VLQ segment')
  }
  return values
}

function decodeMappings(mappings) {
  let sourceIndex = 0
  let originalLine = 0
  let originalColumn = 0
  let nameIndex = 0

  return mappings.split(';').map((line) => {
    let generatedColumn = 0
    return line.split(',').filter(Boolean).map((encoded) => {
      const fields = decodeVlq(encoded)
      generatedColumn += fields[0] ?? 0
      if (fields.length < 4) {
        return { generatedColumn, sourceIndex: null }
      }
      sourceIndex += fields[1] ?? 0
      originalLine += fields[2] ?? 0
      originalColumn += fields[3] ?? 0
      if (fields.length >= 5) {
        nameIndex += fields[4] ?? 0
      }
      return { generatedColumn, sourceIndex }
    })
  })
}

function mappedCharactersBySource(generatedCode, sourceMap) {
  const generatedLines = generatedCode.split('\n')
  const decodedLines = decodeMappings(sourceMap.mappings)
  const totals = new Map()

  for (let lineIndex = 0; lineIndex < decodedLines.length; lineIndex += 1) {
    const segments = decodedLines[lineIndex] ?? []
    const lineLength = generatedLines[lineIndex]?.length ?? 0
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
      const segment = segments[segmentIndex]
      if (segment.sourceIndex === null) continue
      const nextColumn = segments[segmentIndex + 1]?.generatedColumn ?? lineLength
      const size = Math.max(0, nextColumn - segment.generatedColumn)
      const source = sourceMap.sources[segment.sourceIndex] ?? '<unknown>'
      totals.set(source, (totals.get(source) ?? 0) + size)
    }
  }

  return [...totals.entries()]
    .map(([source, mappedCharacters]) => ({ source, mappedCharacters }))
    .sort((left, right) => right.mappedCharacters - left.mappedCharacters)
}

async function profileChunk(distAssets, mapFile) {
  const mapPath = join(distAssets, mapFile)
  const chunkPath = mapPath.slice(0, -4)
  const [sourceMapText, generatedCode, chunkStat] = await Promise.all([
    readFile(mapPath, 'utf8'),
    readFile(chunkPath, 'utf8'),
    stat(chunkPath),
  ])
  const sourceMap = JSON.parse(sourceMapText)
  const sources = mappedCharactersBySource(generatedCode, sourceMap)

  return {
    file: basename(chunkPath),
    bytes: chunkStat.size,
    gzipBytes: gzipSync(generatedCode).length,
    sourceCount: sources.length,
    topSources: sources.slice(0, 15),
  }
}

async function main() {
  const distRoot = join(process.cwd(), 'dist')
  const distAssets = join(distRoot, 'assets')
  const [indexHtml, assetNames] = await Promise.all([
    readFile(join(distRoot, 'index.html'), 'utf8'),
    readdir(distAssets),
  ])
  const entryMatch = indexHtml.match(/<script[^>]+src="\.\/assets\/([^"]+\.js)"/)
  if (!entryMatch) {
    throw new Error('Could not identify the production entry chunk in dist/index.html')
  }
  const mapFiles = assetNames.filter((name) => name.endsWith('.js.map')).sort()
  if (mapFiles.length === 0) {
    throw new Error('No JavaScript source maps found. Run `npm run build -- --sourcemap` first.')
  }

  const chunks = await Promise.all(mapFiles.map((mapFile) => profileChunk(distAssets, mapFile)))
  chunks.sort((left, right) => right.bytes - left.bytes)
  const entryFile = entryMatch[1]
  const entry = chunks.find((chunk) => chunk.file === entryFile)
  if (!entry) {
    throw new Error(`Source map for entry chunk ${entryFile} was not found`)
  }

  const asyncChunks = chunks.filter((chunk) => chunk.file !== entryFile)
  const output = {
    schemaVersion: 'tanchiki.bundle-profile.v1',
    entry,
    asyncChunks,
    totals: {
      chunks: chunks.length,
      bytes: chunks.reduce((total, chunk) => total + chunk.bytes, 0),
      gzipBytes: chunks.reduce((total, chunk) => total + chunk.gzipBytes, 0),
    },
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
}

await main()
