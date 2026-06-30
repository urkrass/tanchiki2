import type { ProgressionState, SaveData, SaveStore, Team, UpgradeLevels } from './types.ts'

export const SAVE_KEY = 'tanchiki.save.v1'

export const DEFAULT_UPGRADES: UpgradeLevels = {
  armor: 0,
  cannon: 0,
  engine: 0,
  repairKit: 0,
}

export function createDefaultProgression(selectedTeam: Team = 'blue'): ProgressionState {
  return {
    selectedTeam,
    bestScore: 0,
    xp: 0,
    credits: 0,
    unlockedStage: 1,
    upgrades: { ...DEFAULT_UPGRADES },
  }
}

export function createDefaultSaveData(): SaveData {
  return {
    schemaVersion: 1,
    progression: createDefaultProgression(),
    resumableRun: null,
  }
}

export function createBrowserSaveStore(): SaveStore {
  return {
    load() {
      try {
        const raw = globalThis.localStorage.getItem(SAVE_KEY)

        if (!raw) {
          return null
        }

        return normalizeSaveData(JSON.parse(raw))
      } catch {
        return null
      }
    },
    save(data) {
      try {
        globalThis.localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeSaveData(data)))
      } catch {
        // Saving is optional; restricted browser contexts should still play.
      }
    },
  }
}

export class MemorySaveStore implements SaveStore {
  private data: SaveData | null

  constructor(initialData: SaveData | null = null) {
    this.data = initialData ? cloneSaveData(initialData) : null
  }

  load() {
    return this.data ? cloneSaveData(this.data) : null
  }

  save(data: SaveData) {
    this.data = cloneSaveData(data)
  }
}

export function cloneSaveData(data: SaveData): SaveData {
  return JSON.parse(JSON.stringify(data)) as SaveData
}

export function normalizeSaveData(value: unknown): SaveData {
  if (!value || typeof value !== 'object') {
    return createDefaultSaveData()
  }

  const candidate = value as Partial<SaveData>

  return {
    schemaVersion: 1,
    progression: normalizeProgression(candidate.progression),
    resumableRun: candidate.resumableRun ?? null,
  }
}

function normalizeProgression(value: unknown): ProgressionState {
  const fallback = createDefaultProgression()

  if (!value || typeof value !== 'object') {
    return fallback
  }

  const candidate = value as Partial<ProgressionState>
  const selectedTeam = candidate.selectedTeam === 'red' ? 'red' : 'blue'
  const upgrades = {
    ...DEFAULT_UPGRADES,
    ...(candidate.upgrades ?? {}),
  }

  return {
    selectedTeam,
    bestScore: safeNumber(candidate.bestScore),
    xp: safeNumber(candidate.xp),
    credits: safeNumber(candidate.credits),
    unlockedStage: Math.max(1, safeNumber(candidate.unlockedStage) || 1),
    upgrades: {
      armor: clampUpgrade(upgrades.armor),
      cannon: clampUpgrade(upgrades.cannon),
      engine: clampUpgrade(upgrades.engine),
      repairKit: clampUpgrade(upgrades.repairKit),
    },
  }
}

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function clampUpgrade(value: unknown) {
  return Math.max(0, Math.min(5, Math.floor(safeNumber(value))))
}
