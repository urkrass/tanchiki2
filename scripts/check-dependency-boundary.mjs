import { readFile } from 'node:fs/promises'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const packageLock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'))
const expectedRuntimeDependencies = {
  '@colyseus/core': '0.17.44',
  '@colyseus/sdk': '0.17.43',
  '@colyseus/ws-transport': '0.17.13',
}
const removedPackages = [
  'colyseus',
  '@colyseus/auth',
  '@colyseus/playground',
  'grant',
  'request-oauth',
]
const findings = []

for (const [name, version] of Object.entries(expectedRuntimeDependencies)) {
  if (packageJson.dependencies?.[name] !== version) {
    findings.push(`${name} must remain pinned to ${version} until a separately reviewed Colyseus migration.`)
  }
  if (!packageLock.packages?.[`node_modules/${name}`]) {
    findings.push(`${name} is missing from package-lock.json.`)
  }
}

for (const name of removedPackages) {
  if (packageJson.dependencies?.[name] || packageLock.packages?.[`node_modules/${name}`]) {
    findings.push(`${name} reintroduces the unused broad server/auth dependency surface.`)
  }
}

if (findings.length > 0) {
  console.error(JSON.stringify({ ok: false, code: 'DEPENDENCY_BOUNDARY_DRIFT', findings }))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  runtimeDependencies: expectedRuntimeDependencies,
  removedPackages,
}))
