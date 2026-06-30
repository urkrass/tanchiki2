export type Direction = 'up' | 'right' | 'down' | 'left'
export type GameMode = 'menu' | 'playing' | 'paused' | 'won' | 'lost'
export type TankFaction = 'player' | 'enemy'
export type TileKind = 'empty' | 'brick' | 'steel' | 'water' | 'trees' | 'base'
export type PowerUpKind = 'repair' | 'rapid' | 'shield'

export interface Vec {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Tile {
  kind: TileKind
  hp: number
}

export interface Tank {
  id: string
  faction: TankFaction
  x: number
  y: number
  dir: Direction
  hp: number
  maxHp: number
  speed: number
  reload: number
  reloadTime: number
  aiCooldown: number
  turnCooldown: number
  spawnGrace: number
  scoreValue: number
  shield: number
  rapid: number
}

export interface Bullet {
  id: string
  owner: TankFaction
  x: number
  y: number
  dir: Direction
  speed: number
  damage: number
  ttl: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export interface PowerUp {
  id: string
  kind: PowerUpKind
  x: number
  y: number
  ttl: number
}

export interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  fire: boolean
}

export interface GameOptions {
  aiEnabled?: boolean
  enemySpawns?: Vec[]
  enemyTotal?: number
  levelRows?: string[]
  playerSpawn?: Vec
  seed?: number
}

export interface GameSnapshot {
  coordinateSystem: string
  mode: GameMode
  score: number
  lives: number
  baseHp: number
  enemiesRemaining: number
  player: {
    x: number
    y: number
    dir: Direction
    hp: number
    shield: number
    rapid: number
  }
  enemies: Array<{
    id: string
    x: number
    y: number
    dir: Direction
    hp: number
  }>
  bullets: Array<{
    owner: TankFaction
    x: number
    y: number
    dir: Direction
  }>
  powerUps: Array<{
    kind: PowerUpKind
    x: number
    y: number
  }>
  terrain: {
    brick: number
    steel: number
    water: number
    base: number
  }
}

export interface RenderState {
  mode: GameMode
  time: number
  score: number
  lives: number
  baseHp: number
  enemiesRemaining: number
  tiles: Tile[][]
  player: Tank
  enemies: Tank[]
  bullets: Bullet[]
  particles: Particle[]
  powerUps: PowerUp[]
}
