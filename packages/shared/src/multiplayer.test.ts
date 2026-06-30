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
    const snapshot = createSnapshotForPlayer(state, player.id)

    expect(visible.size).toBeLessThan(70)
    expect(visible.has('0,0')).toBe(false)
    expect(visible.has(`${player.col},${player.row}`)).toBe(true)
    expect(snapshot?.retranslators).toEqual([])
    expect(snapshot?.fog).toMatchObject({
      visibleCellCount: visible.size,
      hiddenCellCount: 320 - visible.size,
      visibleRetranslatorCount: 0,
      teamVisionMerged: false,
    })
  })

  it('only includes retranslators whose tile is currently visible', () => {
    const state = createMatchState()
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')

    let snapshot = createSnapshotForPlayer(state, player.id)
    expect(snapshot?.retranslators.map((relay) => relay.id)).toEqual([])

    player.col = 3
    player.row = 7
    player.dir = 'right'
    snapshot = createSnapshotForPlayer(state, player.id)

    expect(snapshot?.visibleCells.some((cell) => cell.col === 4 && cell.row === 7)).toBe(true)
    expect(snapshot?.retranslators.map((relay) => relay.id)).toEqual(['relay-1'])
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
    expect(snapshot?.fog.teamVisionMerged).toBe(true)
    expect(snapshot?.players.some((player) => player.id === enemy.id)).toBe(true)
    expect(snapshot?.retranslators.length).toBeGreaterThanOrEqual(1)
    expect(snapshot?.retranslators.length).toBeLessThan(state.retranslators.length)
    for (const relay of snapshot?.retranslators ?? []) {
      expect(snapshot?.visibleCells.some((cell) => cell.col === relay.col && cell.row === relay.row)).toBe(true)
    }
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
    expect(snapshot?.retranslators.every((relay) => snapshot.visibleCells.some((cell) => cell.col === relay.col && cell.row === relay.row))).toBe(true)
    expect(snapshot?.visibleTerrain.some((tile) => tile.col === enemy.col && tile.row === enemy.row)).toBe(false)
  })

  it('records last-known enemies spotted by any teammate before relay vision is active', () => {
    const state = createMatchState()
    const baseGuard = addPlayer(state, 'blue-guard', 'Guard', 'blue')
    const spotter = addPlayer(state, 'blue-spotter', 'Spotter', 'blue')
    const enemy = addPlayer(state, 'red-target', 'Target', 'red')
    baseGuard.col = 0
    baseGuard.row = 15
    baseGuard.dir = 'left'
    spotter.col = 10
    spotter.row = 10
    spotter.dir = 'right'
    enemy.col = 13
    enemy.row = 10
    enemy.dir = 'down'

    step(state, 0.1)
    enemy.col = 19
    enemy.row = 15
    step(state, 0.1)

    const snapshot = createSnapshotForPlayer(state, spotter.id)

    expect(snapshot?.teamVisionMerged).toBe(false)
    expect(snapshot?.players.some((player) => player.id === enemy.id)).toBe(false)
    expect(snapshot?.lastKnown).toContainEqual(
      expect.objectContaining({
        id: enemy.id,
        col: 13,
        row: 10,
        team: 'red',
      }),
    )
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

  it('ignores stale command sequences that arrive after newer input', () => {
    const state = createMatchState()
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    player.col = 6
    player.row = 7

    setPlayerCommand(state, player.id, { right: true, fire: true, seq: 2 })
    setPlayerCommand(state, player.id, { left: true, fire: false, seq: 1 })
    step(state, 0.25)

    expect(player.lastCommandSeq).toBe(2)
    expect(player.lastCommand).toMatchObject({ right: true, left: false, fire: true })
    expect(player.dir).toBe('right')
    expect(player.col).toBeGreaterThan(6)
    expect(state.bullets.length).toBeGreaterThan(0)
  })

  it('keeps radio chat and pings team-scoped in snapshots', () => {
    const state = createMatchState()
    const blue = addPlayer(state, 'blue-one', 'Blue One', 'blue')
    const red = addPlayer(state, 'red-one', 'Red One', 'red')

    addChatMessage(state, blue.id, 'Hold the relay')
    addChatMessage(state, red.id, 'Rush south')
    addTeamPing(state, blue.id, blue.col, blue.row)
    addTeamPing(state, blue.id, 4, 7)
    addTeamPing(state, red.id, 15, 8)

    const blueSnapshot = createSnapshotForPlayer(state, blue.id)
    const redSnapshot = createSnapshotForPlayer(state, red.id)

    expect(blueSnapshot?.chat.map((message) => message.text)).toEqual(['Hold the relay'])
    expect(redSnapshot?.chat.map((message) => message.text)).toEqual(['Rush south'])
    expect(blueSnapshot?.pings.map((ping) => `${ping.col},${ping.row}`)).toEqual([`${blue.col},${blue.row}`])
    expect(redSnapshot?.pings.map((ping) => `${ping.col},${ping.row}`)).toEqual([])
  })
})
