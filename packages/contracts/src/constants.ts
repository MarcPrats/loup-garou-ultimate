type ValueOf<T> = T[keyof T]

export const APPLICATION = {
  ID: 'loup-garou-ultimate',
  VERSION: '3.0.0-dev',
} as const

export const API_ROUTE = {
  HEALTH: '/api/health',
  ROLE_ACCESS_PREFIX: '/api/role',
  SIMULATOR: '/api/test/simulator',
} as const

export const LOBBY_ID = {
  MAIN: 'main',
} as const

export const PLAYER_COUNT_LIMIT = {
  MINIMUM: 5,
  MAXIMUM: 12,
} as const

export const LOBBY_PHASE = {
  LOBBY: 'lobby',
  STARTED: 'started',
  CLOSED: 'closed',
} as const
export type LobbyPhase = ValueOf<typeof LOBBY_PHASE>

export const ROLE_ACCESS_VIEW = {
  PLAYER: 'player',
  GAME_MASTER: 'game-master',
} as const
export type RoleAccessView = ValueOf<typeof ROLE_ACCESS_VIEW>

export const SESSION_DESTINATION = {
  LOBBY: 'lobby',
  PLAYER_ROLE: 'player-role',
  GAME_MASTER: 'game-master',
} as const
export type SessionDestination = ValueOf<typeof SESSION_DESTINATION>

export const TEAM = {
  VILLAGERS: 'villagers',
  WEREWOLVES: 'werewolves',
} as const
export type Team = ValueOf<typeof TEAM>

export const ROLE_CATEGORY = {
  VILLAGER: 'villager',
  OUTSIDER: 'outsider',
  WEREWOLF: 'werewolf',
  ULTIMATE_WEREWOLF: 'ultimate-werewolf',
} as const
export type RoleCategory = ValueOf<typeof ROLE_CATEGORY>

export const SPECIAL_INFORMATION_TYPE = {
  RENARD: 'renard',
  PETITE_FILLE: 'petite-fille',
} as const
export type SpecialInformationType = ValueOf<typeof SPECIAL_INFORMATION_TYPE>

export const NOTIFICATION_LEVEL = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const
export type NotificationLevel = ValueOf<typeof NOTIFICATION_LEVEL>

export const LOBBY_CLOSED_REASON = {
  HOST_LEFT: 'host-left',
  EXPIRED: 'expired',
  RESET: 'reset',
} as const
export type LobbyClosedReason = ValueOf<typeof LOBBY_CLOSED_REASON>

export const SESSION_ENDED_REASON = {
  LEFT: 'left',
  KICKED: 'kicked',
  EXPIRED: 'expired',
} as const
export type SessionEndedReason = ValueOf<typeof SESSION_ENDED_REASON>

export const ERROR_CODE = {
  INVALID_PAYLOAD: 'invalid-payload',
  INVALID_PLAYER_NAME: 'invalid-player-name',
  LOBBY_FULL: 'lobby-full',
  LOBBY_CLOSED: 'lobby-closed',
  GAME_ALREADY_STARTED: 'game-already-started',
  GAME_NOT_STARTED: 'game-not-started',
  SESSION_NOT_FOUND: 'session-not-found',
  LOBBY_NOT_FOUND: 'lobby-not-found',
  PLAYER_NOT_FOUND: 'player-not-found',
  NOT_GAME_MASTER: 'not-game-master',
  NOT_ENOUGH_PLAYERS: 'not-enough-players',
  PLAYERS_DISCONNECTED: 'players-disconnected',
  TOO_MANY_PLAYERS: 'too-many-players',
  INVALID_ROLE_TOKEN: 'invalid-role-token',
  SIMULATOR_DISABLED: 'simulator-disabled',
  INTERNAL_ERROR: 'internal-error',
} as const
export type ErrorCode = ValueOf<typeof ERROR_CODE>

export const SOCKET_EVENT = {
  SYSTEM_READY: 'system:ready',
  LOBBY_ENTER: 'lobby:enter',
  LOBBY_CREATE: 'lobby:create',
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LIST: 'lobby:list',
  SESSION_RESUME: 'session:resume',
  PLAYER_LEAVE: 'player:leave',
  HOST_KICK: 'host:kick',
  GAME_START: 'game:start',
  KEEP_ALIVE: 'session:keep-alive',
  LOBBY_SNAPSHOT: 'lobby:snapshot',
  GAME_STARTED: 'game:started',
  PRIVATE_ASSIGNMENT: 'assignment:private',
  HOST_DASHBOARD: 'host:dashboard',
  LOBBY_CLOSED: 'lobby:closed',
  SESSION_ENDED: 'session:ended',
  NOTIFICATION: 'notification',
} as const
