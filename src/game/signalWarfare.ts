import type {
  CombatSide,
  LevelSignalJammerDefinition,
  OfflineRetranslator,
  OfflineSignalWarfareSnapshot,
  Tile,
} from './types.ts'

export interface SignalWarfareEnvironment {
  tileAt: (col: number, row: number) => Pick<Tile, 'kind' | 'hp'> | undefined
  isCellEmpDisrupted: (col: number, row: number) => boolean
}

export function isSignalJammerOperational(
  jammer: LevelSignalJammerDefinition,
  environment: SignalWarfareEnvironment,
) {
  const anchor = environment.tileAt(jammer.cell.x, jammer.cell.y)
  return Boolean(anchor && anchor.kind === 'brick' && anchor.hp > 0)
}

export function isSignalJammerEmpDisabled(
  jammer: LevelSignalJammerDefinition,
  environment: SignalWarfareEnvironment,
) {
  return isSignalJammerOperational(jammer, environment)
    && environment.isCellEmpDisrupted(jammer.cell.x, jammer.cell.y)
}

export function isRelayJammedForSide(options: {
  relay: OfflineRetranslator
  side: CombatSide
  jammers: readonly LevelSignalJammerDefinition[]
  environment: SignalWarfareEnvironment
}) {
  return options.jammers.some((jammer) =>
    jammer.side !== options.side
    && isSignalJammerOperational(jammer, options.environment)
    && !isSignalJammerEmpDisabled(jammer, options.environment)
    && manhattan(
      options.relay.col,
      options.relay.row,
      jammer.cell.x,
      jammer.cell.y,
    ) <= jammer.radius,
  )
}

export function createSignalWarfareSnapshot(options: {
  jammers: readonly LevelSignalJammerDefinition[]
  relays: readonly OfflineRetranslator[]
  side: CombatSide
  anchorMaxHp: number
  environment: SignalWarfareEnvironment
  isCellVisible: (col: number, row: number) => boolean
}): OfflineSignalWarfareSnapshot {
  const operational = options.jammers.filter((jammer) =>
    isSignalJammerOperational(jammer, options.environment),
  )
  const effective = operational.filter((jammer) =>
    !isSignalJammerEmpDisabled(jammer, options.environment),
  )
  const suppressedRelayCount = options.relays.filter((relay) =>
    relay.owner === options.side
    && isRelayJammedForSide({
      relay,
      side: options.side,
      jammers: options.jammers,
      environment: options.environment,
    }),
  ).length

  return {
    state: effective.length > 0
      ? 'jammed'
      : operational.some((jammer) => isSignalJammerEmpDisabled(jammer, options.environment))
        ? 'emp-window'
        : 'clear',
    activeJammerCount: operational.length,
    suppressedRelayCount,
    visibleJammers: options.jammers
      .filter((jammer) => options.isCellVisible(jammer.cell.x, jammer.cell.y))
      .map((jammer) => {
        const anchor = options.environment.tileAt(jammer.cell.x, jammer.cell.y)
        return {
          id: jammer.id,
          propId: jammer.propId,
          col: jammer.cell.x,
          row: jammer.cell.y,
          radius: jammer.radius,
          side: jammer.side,
          active: isSignalJammerOperational(jammer, options.environment),
          empDisabled: isSignalJammerEmpDisabled(jammer, options.environment),
          anchorHp: Math.max(0, anchor?.hp ?? 0),
          anchorMaxHp: options.anchorMaxHp,
        }
      }),
  }
}

function manhattan(leftCol: number, leftRow: number, rightCol: number, rightRow: number) {
  return Math.abs(leftCol - rightCol) + Math.abs(leftRow - rightRow)
}
