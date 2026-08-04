import {
  PLAYER_COUNT_LIMIT,
  ROLE_ACCESS_VIEW,
  ROOM_ID,
  ROOM_PHASE,
  playerNameSchema,
  simulatorScenarioSchema,
  type PlayerId,
  type RoleAccessToken,
  type SimulatorScenario,
} from '@lgu/contracts'
import {
  assignRoles,
  createSeededRandomSource,
} from '@lgu/game-core'
import {
  projectHostDashboard,
  projectPrivateAssignment,
  type GameProjectionState,
} from '@lgu/game-projection'

const SIMULATOR = {
  HOST_ID: 'simulator_host',
  HOST_NAME: 'Maître du jeu',
  TOKEN_LENGTH: 48,
} as const

export interface SimulatorInput {
  readonly playerNames: readonly string[]
  readonly seed: string
}

function normalizeSeed(seed: string): string {
  const normalized = seed.trim()
  if (!normalized) throw new Error('Le seed du simulateur est obligatoire.')
  if (normalized.length > 120) {
    throw new Error('Le seed du simulateur ne peut pas dépasser 120 caractères.')
  }
  return normalized
}

function normalizePlayerNames(names: readonly string[]): string[] {
  if (
    names.length < PLAYER_COUNT_LIMIT.MINIMUM
    || names.length > PLAYER_COUNT_LIMIT.MAXIMUM
  ) {
    throw new Error(
      `Le simulateur accepte entre ${PLAYER_COUNT_LIMIT.MINIMUM} et ${PLAYER_COUNT_LIMIT.MAXIMUM} joueurs.`,
    )
  }

  const parsed = names.map((name) => playerNameSchema.parse(name.trim()))
  const normalized = new Set(parsed.map((name) => name.toLocaleLowerCase('fr')))
  if (normalized.size !== parsed.length) {
    throw new Error('Chaque joueur simulé doit avoir un nom unique.')
  }
  return parsed
}

function playerId(index: number): PlayerId {
  return `simulator_player_${String(index + 1).padStart(2, '0')}`
}

function syntheticToken(seed: string, audience: string): RoleAccessToken {
  const raw = `simulator_${audience}_${seed}`
    .replace(/[^A-Za-z0-9_-]/g, '_')
  return raw.padEnd(SIMULATOR.TOKEN_LENGTH, '0').slice(0, 120)
}

export function createSimulatorScenario(
  input: SimulatorInput,
): SimulatorScenario {
  const seed = normalizeSeed(input.seed)
  const names = normalizePlayerNames(input.playerNames)
  const assignablePlayers = names.map((name, index) => ({
    id: playerId(index),
    name,
  }))
  const assignment = assignRoles(
    assignablePlayers,
    createSeededRandomSource(seed),
  )
  const state: GameProjectionState = {
    players: [
      {
        id: SIMULATOR.HOST_ID,
        name: SIMULATOR.HOST_NAME,
        connected: true,
        isHost: true,
      },
      ...assignablePlayers.map((player) => ({
        ...player,
        connected: true,
        isHost: false,
      })),
    ],
    assignment,
    roleAccessGrants: [
      {
        playerId: SIMULATOR.HOST_ID,
        token: syntheticToken(seed, 'host'),
        view: ROLE_ACCESS_VIEW.GAME_MASTER,
      },
      ...assignablePlayers.map((player) => ({
        playerId: player.id,
        token: syntheticToken(seed, player.id),
        view: ROLE_ACCESS_VIEW.PLAYER,
      })),
    ],
  }

  return simulatorScenarioSchema.parse({
    seed,
    room: {
      id: ROOM_ID.MAIN,
      phase: ROOM_PHASE.STARTED,
      revision: 1,
      players: state.players.map((player) => ({
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        connected: player.connected,
      })),
      minimumPlayers: PLAYER_COUNT_LIMIT.MINIMUM,
      maximumPlayers: PLAYER_COUNT_LIMIT.MAXIMUM,
      canStart: false,
      createdAt: 0,
    },
    privateAssignments: assignablePlayers.map((player) => (
      projectPrivateAssignment(state, player.id)
    )),
    hostDashboard: projectHostDashboard(state),
  })
}

export function createDefaultPlayerNames(playerCount: number): string[] {
  return Array.from({ length: playerCount }, (_, index) => `Joueur ${index + 1}`)
}

export function createRandomSimulatorSeed(): string {
  return `scenario-${crypto.randomUUID()}`
}
