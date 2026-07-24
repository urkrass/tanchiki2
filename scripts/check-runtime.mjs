import { readFile } from 'node:fs/promises'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const pinnedNode = (await readFile(new URL('../.node-version', import.meta.url), 'utf8')).trim()
const currentNode = process.versions.node
const supportedMajor = 22

if (Number(currentNode.split('.')[0]) !== supportedMajor) {
  console.error(JSON.stringify({
    ok: false,
    code: 'NODE_RUNTIME_UNSUPPORTED',
    expected: packageJson.engines.node,
    pinned: pinnedNode,
    actual: currentNode,
    action: 'Activate the Node version declared in .node-version, then reinstall with npm ci.',
  }))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  node: currentNode,
  pinned: pinnedNode,
  supported: packageJson.engines.node,
}))
