import { isWorldCellInCamera, type BattlefieldCamera } from './battlefield.ts'
import type {
  LevelDefinition,
  LevelReadabilityMarker,
  LevelReadabilityMarkerKind,
  LevelReadabilitySummary,
  SavedObjectiveState,
  Team,
  Vec,
} from './types.ts'

type MarkerPriority = LevelReadabilityMarker['priority']

interface MarkerInput {
  kind: LevelReadabilityMarkerKind
  label: string
  col: number
  row: number
  team: Team | 'neutral' | null
  priority: MarkerPriority
}

export function buildLevelReadabilitySummary(
  level: LevelDefinition,
  objective: SavedObjectiveState,
  camera: BattlefieldCamera,
  playerTeam: Team,
  enemyTeam: Team,
): LevelReadabilitySummary {
  const markerInputs = [
    ...spawnMarkers(level, objective, playerTeam, enemyTeam),
    ...objectiveMarkers(level, objective, playerTeam, enemyTeam),
    ...ammoStationMarkers(level),
    ...criticalCoverMarkers(level, objective),
  ]

  const markers = markerInputs.map((marker) => ({
    ...marker,
    visible: isWorldCellInCamera(camera, marker.col, marker.row),
  }))

  return {
    objectiveMarkerCount: markers.filter((marker) => isObjectiveMarker(marker.kind)).length,
    spawnMarkerCount: markers.filter((marker) => isSpawnMarker(marker.kind)).length,
    criticalCoverCount: markers.filter((marker) => marker.kind === 'critical-cover').length,
    visibleMarkers: markers.filter((marker) => marker.visible).length,
    hiddenMarkers: markers.filter((marker) => !marker.visible).length,
    markers,
  }
}

function ammoStationMarkers(level: LevelDefinition): MarkerInput[] {
  return level.rows.flatMap((row, rowIndex) =>
    [...row]
      .map((char, colIndex) => ({ char, x: colIndex, y: rowIndex }))
      .filter((cell) => cell.char === 'A')
      .map((cell) => marker('ammo-station', 'AMMO', cell, 'neutral', 'secondary')),
  )
}

function spawnMarkers(
  level: LevelDefinition,
  objective: SavedObjectiveState,
  playerTeam: Team,
  enemyTeam: Team,
): MarkerInput[] {
  const usedCells = new Set<string>()
  const playerMarker = marker('player-spawn', 'START', level.playerSpawn, playerTeam, 'primary')
  usedCells.add(cellKey(level.playerSpawn))

  const secondarySpawns = [
    ...level.enemySpawns.map((spawn) => marker('enemy-spawn', 'ENEMY', spawn, enemyTeam, 'secondary')),
    ...(level.objective.friendlySpawns ?? []).map((spawn) => marker('friendly-spawn', 'ALLY', spawn, playerTeam, 'secondary')),
    ...neutralSpawnsFor(level, objective).map((spawn) => marker('neutral-spawn', 'NEUTRAL', spawn, 'neutral', 'secondary')),
  ].filter((spawn) => {
    const key = cellKey({ x: spawn.col, y: spawn.row })
    if (usedCells.has(key)) {
      return false
    }
    usedCells.add(key)
    return true
  })

  return [
    playerMarker,
    ...secondarySpawns,
  ]
}

function objectiveMarkers(
  level: LevelDefinition,
  objective: SavedObjectiveState,
  playerTeam: Team,
  enemyTeam: Team,
): MarkerInput[] {
  if (objective.mode === 'ctf' && objective.flag) {
    return [
      marker('flag-home', 'HOME', objective.flag.playerBase, playerTeam, 'primary'),
      ...(objective.flag.carrierId
        ? []
        : [marker('flag-target', 'FLAG', objective.flag.position, enemyTeam, 'primary')]),
      ...((objective.flag.transfer?.gateClosed || objective.flag.transfer?.trapTriggered) && !objective.flag.transfer.complete
        ? [marker(
            'flag-transfer',
            objective.flag.transfer.trapTriggered ? 'DROP' : 'XFER',
            objective.flag.transfer.dropCell,
            'neutral',
            'primary',
          )]
        : []),
    ]
  }

  if (objective.mode === 'assault' && objective.assault) {
    return [marker('assault-core', 'CORE', objective.assault.cell, enemyTeam, 'primary')]
  }

  return baseCellsFor(level).map((cell) => marker('defense-base', 'BASE', cell, playerTeam, 'primary'))
}

function criticalCoverMarkers(level: LevelDefinition, objective: SavedObjectiveState): MarkerInput[] {
  const cells = new Map<string, MarkerInput>()

  for (const target of objectiveAnchorCells(level, objective)) {
    for (const neighbor of cardinalNeighbors(target)) {
      const tile = level.rows[neighbor.y]?.[neighbor.x]
      if (tile !== 'B' && tile !== 'S') {
        continue
      }

      const key = `${neighbor.x},${neighbor.y}`
      if (!cells.has(key)) {
        cells.set(key, marker('critical-cover', 'COVER', neighbor, null, 'secondary'))
      }
    }
  }

  return [...cells.values()]
}

function objectiveAnchorCells(level: LevelDefinition, objective: SavedObjectiveState): Vec[] {
  if (objective.mode === 'ctf' && objective.flag) {
    return [
      objective.flag.playerBase,
      objective.flag.position,
      ...((objective.flag.transfer?.gateClosed || objective.flag.transfer?.trapTriggered) && !objective.flag.transfer.complete
        ? [objective.flag.transfer.dropCell]
        : []),
    ]
  }

  if (objective.mode === 'assault' && objective.assault) {
    return [objective.assault.cell]
  }

  return baseCellsFor(level)
}

function neutralSpawnsFor(level: LevelDefinition, objective: SavedObjectiveState) {
  return objective.mode === 'ffa' ? level.objective.neutralSpawns ?? [] : []
}

function baseCellsFor(level: LevelDefinition): Vec[] {
  return level.rows.flatMap((row, rowIndex) =>
    [...row]
      .map((char, colIndex) => ({ char, x: colIndex, y: rowIndex }))
      .filter((cell) => cell.char === 'E')
      .map(({ x, y }) => ({ x, y })),
  )
}

function cardinalNeighbors(cell: Vec): Vec[] {
  return [
    { x: cell.x, y: cell.y - 1 },
    { x: cell.x + 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x - 1, y: cell.y },
  ]
}

function marker(
  kind: LevelReadabilityMarkerKind,
  label: string,
  cell: Vec,
  team: Team | 'neutral' | null,
  priority: MarkerPriority,
): MarkerInput {
  return {
    kind,
    label,
    col: cell.x,
    row: cell.y,
    team,
    priority,
  }
}

function cellKey(cell: Vec) {
  return `${cell.x},${cell.y}`
}

function isObjectiveMarker(kind: LevelReadabilityMarkerKind) {
  return kind === 'defense-base'
    || kind === 'flag-home'
    || kind === 'flag-target'
    || kind === 'flag-transfer'
    || kind === 'assault-core'
    || kind === 'training-zone'
    || kind === 'ammo-station'
}

function isSpawnMarker(kind: LevelReadabilityMarkerKind) {
  return kind === 'player-spawn' || kind === 'friendly-spawn' || kind === 'enemy-spawn' || kind === 'neutral-spawn'
}
