import { BATTLEFIELD_VIEW_COLS, BATTLEFIELD_VIEW_ROWS, battlefieldCellKey, type BattlefieldCamera } from '../game/battlefield.ts'
import type {
  MultiplayerSnapshot,
  Retranslator,
  TeamPing,
  TileKind,
  VisibleCell,
  VisiblePlayer,
  VisionCircle,
  VisionMemory,
} from '../../packages/shared/src/index.ts'

export const ONLINE_MINIMAP_CELL_SIZE = 3
export const ONLINE_MINIMAP_COLS = 20
export const ONLINE_MINIMAP_ROWS = 16
export const ONLINE_MINIMAP_FOG_POLICY = 'circular-live-vision-only'

export interface OnlineMinimapTerrain extends VisibleCell {
  kind: TileKind
}

export interface OnlineMinimapModel {
  enabled: boolean
  fogPolicy: typeof ONLINE_MINIMAP_FOG_POLICY
  visibleCells: VisibleCell[]
  terrain: OnlineMinimapTerrain[]
  players: VisiblePlayer[]
  retranslators: Retranslator[]
  pings: TeamPing[]
  lastKnown: VisionMemory[]
  visionCircles: VisionCircle[]
  viewport: {
    col: number
    row: number
    cols: number
    rows: number
  }
  visibleCellCount: number
  visibleRetranslatorCount: number
}

export function buildOnlineMinimapModel(snapshot: MultiplayerSnapshot, camera: BattlefieldCamera): OnlineMinimapModel {
  const visible = new Set(snapshot.visibleCells.map((cell) => battlefieldCellKey(cell.col, cell.row)))

  return {
    enabled: true,
    fogPolicy: ONLINE_MINIMAP_FOG_POLICY,
    visibleCells: snapshot.visibleCells,
    terrain: snapshot.visibleTerrain.filter((tile) => visible.has(battlefieldCellKey(tile.col, tile.row))),
    players: snapshot.players.filter((player) => visible.has(battlefieldCellKey(player.col, player.row))),
    retranslators: snapshot.retranslators.filter((relay) => visible.has(battlefieldCellKey(relay.col, relay.row))),
    pings: snapshot.pings.filter((ping) => visible.has(battlefieldCellKey(ping.col, ping.row))),
    lastKnown: snapshot.lastKnown.filter((memory) => visible.has(battlefieldCellKey(memory.col, memory.row))),
    visionCircles: snapshot.vision.circles,
    viewport: {
      col: camera.col,
      row: camera.row,
      cols: BATTLEFIELD_VIEW_COLS,
      rows: BATTLEFIELD_VIEW_ROWS,
    },
    visibleCellCount: snapshot.fog.visibleCellCount,
    visibleRetranslatorCount: snapshot.fog.visibleRetranslatorCount,
  }
}
