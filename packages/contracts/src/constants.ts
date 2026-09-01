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
  MAIN: 'main-lobby',
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

export const GAME_PHASE_PERIOD = {
  NIGHT: 'night',
  DAY: 'day',
} as const
export type GamePhasePeriod = ValueOf<typeof GAME_PHASE_PERIOD>

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

export const GAME_LOG_EVENT_TYPE = {
  NIGHT_KILL: 'night-kill',
  DAY_EXECUTION: 'day-execution',
  DAY_VOTE: 'day-vote',
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
  STALE_REVISION: 'stale-revision',
  INVALID_GAME_EVENT: 'invalid-game-event',
  GAME_EVENT_NOT_FOUND: 'game-event-not-found',
  PLAYER_ALREADY_DEAD: 'player-already-dead',
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
  GAME_START_CONFIRM: 'game:start-confirm',
  GAME_START_CANCEL: 'game:start-cancel',
  GAME_START_REDISTRIBUTE: 'game:start-redistribute',
  GAME_PHASE_ADVANCE: 'game:phase-advance',
  GAME_PHASE_REWIND: 'game:phase-rewind',
  GAME_LOG_RECORD: 'game-log:record',
  GAME_LOG_EDIT: 'game-log:edit',
  GAME_LOG_DELETE: 'game-log:delete',
  DAY_NOMINATION_PROPOSE: 'day:nomination-propose',
  DAY_NOMINATION_APPROVE: 'day:nomination-approve',
  DAY_NOMINATION_REJECT: 'day:nomination-reject',
  DAY_VOTE_SUBMIT: 'day:vote-submit',
  DAY_VOTE_START: 'day:vote-start',
  LOBBY_DAY_VOTING_SET: 'lobby:day-voting-set',
  KEEP_ALIVE: 'session:keep-alive',
  LOBBY_SNAPSHOT: 'lobby:snapshot',
  GAME_STARTED: 'game:started',
  PRIVATE_ASSIGNMENT: 'assignment:private',
  HOST_DASHBOARD: 'host:dashboard',
  HOST_START_PREVIEW: 'host:start-preview',
  LOBBY_CLOSED: 'lobby:closed',
  SESSION_ENDED: 'session:ended',
  NOTIFICATION: 'notification',
} as const
