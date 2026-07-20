import type { TankClassPresentation } from './types.ts'

export function getTankClassDescriptionModel(
  tankClass: TankClassPresentation,
) {
  const speed = tankClass.performance.speed.replace('s / TILE', '')
  const stats = [
    `SPD ${speed}`,
    `HIT ${tankClass.demonstration.directDamage}`,
    `HP ${tankClass.demonstration.maxHp}`,
  ]
  if (tankClass.demonstration.shieldPoints > 0) {
    stats.push(`SH ${tankClass.demonstration.shieldPoints}`)
  }

  const projectileEffect =
    tankClass.demonstration.splashDamage > 0
      ? `${tankClass.demonstration.directDamage}+${tankClass.demonstration.splashDamage} SPLASH / ${tankClass.demonstration.splashRadius}PX`
      : `${tankClass.demonstration.directDamage} DIRECT`

  const nativeKit = tankClass.nativeKit
    .filter((item) => !item.kind.endsWith('-shell'))
    .map((item) => ({
      ...item,
      effect:
        item.kind === 'decoy'
          ? 'FALSE CONTACT'
          : item.kind === 'tripwire'
            ? 'CROSSING ALERT'
            : item.kind === 'mine'
              ? `${tankClass.demonstration.mineDamage} DMG / ${tankClass.demonstration.mineSlowSeconds}S SLOW`
              : item.kind === 'steel'
                ? `IMMOBILIZE ${tankClass.demonstration.trapSeconds}S`
                : item.kind === 'shield'
                  ? `ABSORB ${tankClass.demonstration.shieldPoints} DAMAGE`
                  : item.effect,
    }))

  return {
    strategy: tankClass.strategy.toUpperCase(),
    performance: stats.join('  '),
    relay: `E RELAY X${tankClass.portableRelayLimit}`,
    projectile: {
      label: tankClass.projectile.label.toUpperCase(),
      effect: projectileEffect,
      reload: `RELOAD ${tankClass.performance.reload.toUpperCase()}`,
    },
    nativeKit,
    strength: `BEST / ${tankClass.strength.toUpperCase()}`,
    caution: `WATCH / ${tankClass.caution.toUpperCase()}`,
  }
}
