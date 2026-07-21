import { DEFAULT_TANK_CLASS, normalizeTankClassId } from './tankClasses.ts'
import type { MajorModKind, ProgressionState, SaveData, SaveStore, SettingsState, Team, UpgradeLevels } from './types.ts'

export const SAVE_KEY = 'tanchiki.save.v1'
export const DEFAULT_MAJOR_MOD: MajorModKind = 'overdrive'

export const DEFAULT_UPGRADES: UpgradeLevels = {
  armor: 0,
  cannon: 0,
  engine: 0,
  repairKit: 0,
}

export const DEFAULT_SETTINGS: SettingsState = {
  volume: 0.7,
  muted: false,
  colorSafe: false,
  touchHandedness: 'standard',
}

export function createDefaultProgression(selectedTeam: Team = 'blue'): ProgressionState {
  return {
    selectedTeam,
    selectedTankClass: DEFAULT_TANK_CLASS,
    bestScore: 0,
    xp: 0,
    credits: 0,
    unlockedStage: 1,
    completedLevels: [],
    tutorialCompletedMissions: [],
    selectedMajorMod: DEFAULT_MAJOR_MOD,
    upgrades: { ...DEFAULT_UPGRADES },
  }
}

export function createDefaultSaveData(): SaveData {
  return {
    schemaVersion: 1,
    progression: createDefaultProgression(),
    settings: { ...DEFAULT_SETTINGS },
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
    this.data = initialData ? normalizeSaveData(initialData) : null
  }

  load() {
    return this.data ? cloneSaveData(this.data) : null
  }

  save(data: SaveData) {
    this.data = normalizeSaveData(data)
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
    settings: normalizeSettings(candidate.settings),
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
  const selectedTankClass = normalizeTankClassId(candidate.selectedTankClass)
  const unlockedStage = Math.max(1, safeNumber(candidate.unlockedStage) || 1)
  const migratedCompleted = Array.from({ length: Math.max(0, unlockedStage - 1) }, (_, index) => index + 1)
  const completedLevels = normalizeCompletedLevels(candidate.completedLevels, migratedCompleted)
  const tutorialCompletedMissions = normalizeCompletedLevels(candidate.tutorialCompletedMissions, [])
    .filter((mission) => mission <= 6)
  const upgrades = {
    ...DEFAULT_UPGRADES,
    ...(candidate.upgrades ?? {}),
  }

  return {
    selectedTeam,
    selectedTankClass,
    bestScore: safeNumber(candidate.bestScore),
    xp: safeNumber(candidate.xp),
    credits: safeNumber(candidate.credits),
    unlockedStage,
    completedLevels,
    tutorialCompletedMissions,
    selectedMajorMod: normalizeMajorModKind(candidate.selectedMajorMod),
    upgrades: {
      armor: clampUpgrade(upgrades.armor),
      cannon: clampUpgrade(upgrades.cannon),
      engine: clampUpgrade(upgrades.engine),
      repairKit: clampUpgrade(upgrades.repairKit),
    },
  }
}

function normalizeMajorModKind(value: unknown): MajorModKind {
  return value === 'overdrive' || value === 'pontoon' || value === 'hedgehog' || value === 'emp' ? value : DEFAULT_MAJOR_MOD
}

function normalizeCompletedLevels(value: unknown, fallback: number[]) {
  const source = Array.isArray(value) ? value : fallback
  const levels = source
    .map((level) => Math.floor(safeNumber(level)))
    .filter((level) => level > 0)
  return [...new Set(levels)].sort((a, b) => a - b)
}

function normalizeSettings(value: unknown): SettingsState {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SETTINGS }
  }

  const candidate = value as Partial<SettingsState>

  return {
    volume: clamp01(safeNumber(candidate.volume, DEFAULT_SETTINGS.volume)),
    muted: candidate.muted === true,
    colorSafe: candidate.colorSafe === true,
    touchHandedness: candidate.touchHandedness === 'mirrored' ? 'mirrored' : 'standard',
  }
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clampUpgrade(value: unknown) {
  return Math.max(0, Math.min(5, Math.floor(safeNumber(value))))
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}
