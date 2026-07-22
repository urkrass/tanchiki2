export function readCliValue(argv, name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

export function parseSyntheticLabArgs(argv) {
  const value = (name) => readCliValue(argv, name)
  const seed = value('--seed')
  return {
    matches: Math.max(1, Number.parseInt(value('--matches') ?? '3', 10)),
    seed: seed === undefined ? null : Number.parseInt(seed, 10) >>> 0,
    mode: value('--mode') === 'seeded' ? 'seeded' : 'scripted',
    realtime: argv.includes('--realtime'),
    progress: argv.includes('--progress'),
  }
}

export function parseFaultLabArgs(argv) {
  return {
    profile: readCliValue(argv, '--profile') ?? 'mixed',
    matches: Math.max(1, Number.parseInt(readCliValue(argv, '--matches') ?? '1', 10)),
    seed: Number.parseInt(readCliValue(argv, '--seed') ?? '20260722', 10) >>> 0,
  }
}
