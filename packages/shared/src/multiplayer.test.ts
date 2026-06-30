import { describe, expect, it } from 'vitest'
import {
  addChatMessage,
  addPlayer,
  addTeamPing,
  computeVisibleSet,
  createMatchState,
  createSnapshotForPlayer,
  hasTeamRelay,
  setPlayerCommand,
  updateMatch,
} from './multiplayer.ts'

function step(state: ReturnType<typeof createMatchState>, seconds: number) {
  const frames = Math.ceil(seconds * 20)
  for (let index = 0; index < frames; index += 1) {
    updateMatch(state, 1 / 20)
  }
}

describe('multiplayer vision and retranslators', () => {
  it('starts with narrow personal vision instead of the full map', () => {
    const state = createMatchState()
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    const visible = computeVisibleSet(state, player.id)

    expect(visible.size).toBeLessThan(70)
    expect(visible.has('0,0')).toBe(false)
    expect(visible.has(`${player.col},${player.row}`)).toBe(true)
  })

  it('captures a retranslator and merges teammate vision for the team', () => {
    const state = createMatchState()
    const scout = addPlayer(state, 'blue-scout', 'Scout', 'blue')
    const spotter = addPlayer(state, 'blue-spotter', 'Spotter', 'blue')
    const enemy = addPlayer(state, 'red-target', 'Target', 'red')
    scout.col = 3
    scout.row = 7
    scout.dir = 'right'
    spotter.col = 15
    spotter.row = 14
    spotter.dir = 'up'
    enemy.col = 15
    enemy.row = 11
    enemy.dir = 'down'

    let snapshot = createSnapshotForPlayer(state, scout.id)
    expect(snapshot?.teamVisionMerged).toBe(false)
    expect(snapshot?.players.some((player) => player.id === enemy.id)).toBe(false)

    step(state, 3.1)
    snapshot = createSnapshotForPlayer(state, scout.id)

    expect(hasTeamRelay(state, 'blue')).toBe(true)
    expect(snapshot?.teamVisionMerged).toBe(true)
    expect(snapshot?.players.some((player) => player.id === enemy.id)).toBe(true)
  })

  it('keeps short last-known markers when enemies leave merged vision', () => {
    const state = createMatchState()
    const scout = addPlayer(state, 'blue-scout', 'Scout', 'blue')
    const spotter = addPlayer(state, 'blue-spotter', 'Spotter', 'blue')
    const enemy = addPlayer(state, 'red-target', 'Target', 'red')
    scout.col = 3
    scout.row = 7
    scout.dir = 'right'
    spotter.col = 15
    spotter.row = 14
    spotter.dir = 'up'
    enemy.col = 15
    enemy.row = 11
    enemy.dir = 'down'
    step(state, 3.1)
    enemy.col = 19
    enemy.row = 15
    step(state, 0.2)

    const snapshot = createSnapshotForPlayer(state, scout.id)

    expect(snapshot?.players.some((player) => player.id === enemy.id)).toBe(false)
    expect(snapshot?.lastKnown.some((memory) => memory.id === enemy.id)).toBe(true)
  })

  it('applies authoritative commands for movement and firing', () => {
    const state = createMatchState()
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    player.col = 6
    player.row = 7

    setPlayerCommand(state, player.id, { right: true, fire: true, seq: 1 })
    step(state, 0.25)

    expect(player.dir).toBe('right')
    expect(player.col).toBeGreaterThan(5)
    expect(state.bullets.length).toBeGreaterThan(0)
  })

  it('keeps radio chat and pings team-scoped in snapshots', () => {
    const state = createMatchState()
    const blue = addPlayer(state, 'blue-one', 'Blue One', 'blue')
    const red = addPlayer(state, 'red-one', 'Red One', 'red')

    addChatMessage(state, blue.id, 'Hold the relay')
    addChatMessage(state, red.id, 'Rush south')
    addTeamPing(state, blue.id, 4, 7)
    addTeamPing(state, red.id, 15, 8)

    const blueSnapshot = createSnapshotForPlayer(state, blue.id)
    const redSnapshot = createSnapshotForPlayer(state, red.id)

    expect(blueSnapshot?.chat.map((message) => message.text)).toEqual(['Hold the relay'])
    expect(redSnapshot?.chat.map((message) => message.text)).toEqual(['Rush south'])
    expect(blueSnapshot?.pings.map((ping) => `${ping.col},${ping.row}`)).toEqual(['4,7'])
    expect(redSnapshot?.pings.map((ping) => `${ping.col},${ping.row}`)).toEqual(['15,8'])
  })
})
