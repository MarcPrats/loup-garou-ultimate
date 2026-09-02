import { z } from 'zod'

import {
  LOBBY_ID,
  LOBBY_PHASE,
  SESSION_DESTINATION,
  type LobbyPhase,
  type SessionDestination,
} from './constants'
import { gameLogEntrySchema } from './game-log'
import { gamePhaseSchema } from './game-phase'
import { dayVoteSnapshotSchema } from './day-voting'
import {
  playerIdSchema,
  playerNameSchema,
  revisionSchema,
  lobbyIdSchema,
  sessionTokenSchema,
  timestampSchema,
} from './identifiers'

const lobbyPhaseValues = Object.values(LOBBY_PHASE) as [LobbyPhase, ...LobbyPhase[]]
const sessionDestinationValues = Object.values(SESSION_DESTINATION) as [
  SessionDestination,
  ...SessionDestination[],
]

export const lobbyPhaseSchema = z.enum(lobbyPhaseValues)
export const sessionDestinationSchema = z.enum(sessionDestinationValues)

export const publicPlayerSchema = z.object({
  id: playerIdSchema,
  name: playerNameSchema,
  isHost: z.boolean(),
  connected: z.boolean(),
  alive: z.boolean(),
}).strict()

export const lobbySnapshotSchema = z.object({
  id: lobbyIdSchema,
  phase: lobbyPhaseSchema,
  gamePhase: gamePhaseSchema.nullable(),
  gameEnded: z.boolean(),
  gameLog: z.array(gameLogEntrySchema),
  dayVotingEnabled: z.boolean(),
  dayVote: dayVoteSnapshotSchema.nullable(),
  revision: revisionSchema,
  players: z.array(publicPlayerSchema),
  minimumPlayers: z.number().int().positive(),
  maximumPlayers: z.number().int().positive(),
  canStart: z.boolean(),
  createdAt: timestampSchema,
}).strict().superRefine((lobby, context) => {
  if (lobby.minimumPlayers > lobby.maximumPlayers) {
    context.addIssue({
      code: 'custom',
      message: 'minimumPlayers cannot exceed maximumPlayers',
      path: ['minimumPlayers'],
    })
  }
  if (lobby.players.length > lobby.maximumPlayers + 1) {
    context.addIssue({
      code: 'custom',
      message: 'Lobby contains more players than its configured maximum',
      path: ['players'],
    })
  }
})

export const sessionCredentialsSchema = z.object({
  lobbyId: lobbyIdSchema.default(LOBBY_ID.MAIN),
  playerId: playerIdSchema,
  sessionToken: sessionTokenSchema,
}).strict()

export const lobbyListResponseSchema = z.array(lobbySnapshotSchema)

export const lobbyEntryResponseSchema = z.object({
  session: sessionCredentialsSchema,
  lobby: lobbySnapshotSchema,
  destination: sessionDestinationSchema,
}).strict()

export const sessionResumeResponseSchema = lobbyEntryResponseSchema

export type PublicPlayer = z.infer<typeof publicPlayerSchema>
export type LobbySnapshot = z.infer<typeof lobbySnapshotSchema>
export type LobbyListResponse = z.infer<typeof lobbyListResponseSchema>
export type SessionCredentials = z.infer<typeof sessionCredentialsSchema>
export type LobbyEntryResponse = z.infer<typeof lobbyEntryResponseSchema>
export type SessionResumeResponse = z.infer<typeof sessionResumeResponseSchema>
