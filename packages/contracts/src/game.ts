import { z } from 'zod'

import {
  NOTIFICATION_LEVEL,
  LOBBY_CLOSED_REASON,
  SESSION_ENDED_REASON,
  type NotificationLevel,
  type LobbyClosedReason,
  type SessionEndedReason,
} from './constants'
import {
  revisionSchema,
  roleAccessTokenSchema,
  timestampSchema,
} from './identifiers'
import { hostPlayerAssignmentSchema } from './roles'

const notificationLevelValues = Object.values(NOTIFICATION_LEVEL) as [
  NotificationLevel,
  ...NotificationLevel[],
]
const lobbyClosedReasonValues = Object.values(LOBBY_CLOSED_REASON) as [
  LobbyClosedReason,
  ...LobbyClosedReason[],
]
const sessionEndedReasonValues = Object.values(SESSION_ENDED_REASON) as [
  SessionEndedReason,
  ...SessionEndedReason[],
]

export const notificationLevelSchema = z.enum(notificationLevelValues)
export const lobbyClosedReasonSchema = z.enum(lobbyClosedReasonValues)
export const sessionEndedReasonSchema = z.enum(sessionEndedReasonValues)

export const systemReadyEventSchema = z.object({
  message: z.string().min(1).max(200),
}).strict()

export const gameStartedEventSchema = z.object({
  lobbyRevision: revisionSchema,
  startedAt: timestampSchema,
}).strict()

export const hostDashboardSchema = z.object({
  roleAccessToken: roleAccessTokenSchema,
  players: z.array(hostPlayerAssignmentSchema),
  playerCount: z.number().int().positive(),
  werewolfCount: z.number().int().nonnegative(),
  villagerTeamCount: z.number().int().nonnegative(),
}).strict()

export const gameStartPreviewSchema = z.object({
  players: z.array(hostPlayerAssignmentSchema),
  playerCount: z.number().int().positive(),
  werewolfCount: z.number().int().nonnegative(),
  villagerTeamCount: z.number().int().nonnegative(),
}).strict()

export const lobbyClosedEventSchema = z.object({
  reason: lobbyClosedReasonSchema,
  message: z.string().min(1).max(300),
}).strict()

export const sessionEndedEventSchema = z.object({
  reason: sessionEndedReasonSchema,
  message: z.string().min(1).max(300),
}).strict()

export const notificationEventSchema = z.object({
  level: notificationLevelSchema,
  message: z.string().min(1).max(300),
}).strict()

export type SystemReadyEvent = z.infer<typeof systemReadyEventSchema>
export type GameStartedEvent = z.infer<typeof gameStartedEventSchema>
export type HostDashboard = z.infer<typeof hostDashboardSchema>
export type GameStartPreview = z.infer<typeof gameStartPreviewSchema>
export type LobbyClosedEvent = z.infer<typeof lobbyClosedEventSchema>
export type SessionEndedEvent = z.infer<typeof sessionEndedEventSchema>
export type NotificationEvent = z.infer<typeof notificationEventSchema>
