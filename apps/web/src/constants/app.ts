export const CONNECTION_STATE = {
  OFFLINE: 'offline',
  CONNECTING: 'connecting',
  ONLINE: 'online',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
} as const
export type ConnectionState = typeof CONNECTION_STATE[keyof typeof CONNECTION_STATE]

export const API_STATE = {
  CHECKING: 'checking',
  READY: 'ready',
  ERROR: 'error',
} as const
export type ApiState = typeof API_STATE[keyof typeof API_STATE]

export const CLIENT_TIMING = {
  ACK_TIMEOUT_MS: 8_000,
  CONNECT_TIMEOUT_MS: 8_000,
  KEEP_ALIVE_INTERVAL_MS: 25_000,
  NOTICE_DURATION_MS: 4_000,
  PRIVATE_VIEW_RECOVERY_DELAY_MS: 1_500,
} as const

export const STORAGE_KEY = {
  SESSION: 'lgu:v3:session',
} as const

export const ROUTE_NAME = {
  HOME: 'home',
  ENTRY: 'entry',
  LOBBY: 'lobby',
  PLAYER_ROLE: 'player-role',
  GAME_MASTER: 'game-master',
  ROLE_ACCESS: 'role-access',
  ROLE_DETAIL: 'role-detail',
  RULES: 'rules',
  SIMULATOR: 'simulator',
} as const
export type RouteName = typeof ROUTE_NAME[keyof typeof ROUTE_NAME]

export const ROUTE_PATH = {
  HOME: '/',
  ENTRY: '/waiting_room',
  LOBBY: '/lobby/:lobbyId?',
  PLAYER_ROLE: '/role',
  GAME_MASTER: '/game-master',
  ROLE_ACCESS: '/access',
  ROLE_DETAIL: '/rules/role/:roleId',
  RULES: '/rules',
  SIMULATOR: '/simulator',
} as const

export const PUBLIC_LINK = {
  WIKI: 'https://wiki.bloodontheclocktower.com/Trouble_Brewing',
} as const
