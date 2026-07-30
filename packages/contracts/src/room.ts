import { z } from 'zod'

import {
  ROOM_PHASE,
  SESSION_DESTINATION,
  type RoomPhase,
  type SessionDestination,
} from './constants'
import {
  playerIdSchema,
  playerNameSchema,
  revisionSchema,
  roomIdSchema,
  sessionTokenSchema,
  timestampSchema,
} from './identifiers'

const roomPhaseValues = Object.values(ROOM_PHASE) as [RoomPhase, ...RoomPhase[]]
const sessionDestinationValues = Object.values(SESSION_DESTINATION) as [
  SessionDestination,
  ...SessionDestination[],
]

export const roomPhaseSchema = z.enum(roomPhaseValues)
export const sessionDestinationSchema = z.enum(sessionDestinationValues)

export const publicPlayerSchema = z.object({
  id: playerIdSchema,
  name: playerNameSchema,
  isHost: z.boolean(),
  connected: z.boolean(),
}).strict()

export const roomSnapshotSchema = z.object({
  id: roomIdSchema,
  phase: roomPhaseSchema,
  revision: revisionSchema,
  players: z.array(publicPlayerSchema),
  minimumPlayers: z.number().int().positive(),
  maximumPlayers: z.number().int().positive(),
  canStart: z.boolean(),
  createdAt: timestampSchema,
}).strict().superRefine((room, context) => {
  if (room.minimumPlayers > room.maximumPlayers) {
    context.addIssue({
      code: 'custom',
      message: 'minimumPlayers cannot exceed maximumPlayers',
      path: ['minimumPlayers'],
    })
  }
  if (room.players.length > room.maximumPlayers + 1) {
    context.addIssue({
      code: 'custom',
      message: 'Room contains more players than its configured maximum',
      path: ['players'],
    })
  }
})

export const sessionCredentialsSchema = z.object({
  playerId: playerIdSchema,
  sessionToken: sessionTokenSchema,
}).strict()

export const roomEntryResponseSchema = z.object({
  session: sessionCredentialsSchema,
  room: roomSnapshotSchema,
  destination: sessionDestinationSchema,
}).strict()

export const sessionResumeResponseSchema = roomEntryResponseSchema

export type PublicPlayer = z.infer<typeof publicPlayerSchema>
export type RoomSnapshot = z.infer<typeof roomSnapshotSchema>
export type SessionCredentials = z.infer<typeof sessionCredentialsSchema>
export type RoomEntryResponse = z.infer<typeof roomEntryResponseSchema>
export type SessionResumeResponse = z.infer<typeof sessionResumeResponseSchema>
