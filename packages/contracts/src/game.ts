import { z } from 'zod'

import {
  NOTIFICATION_LEVEL,
  ROOM_CLOSED_REASON,
  SESSION_ENDED_REASON,
  type NotificationLevel,
  type RoomClosedReason,
  type SessionEndedReason,
} from './constants'
import { revisionSchema, timestampSchema } from './identifiers'
import { hostPlayerAssignmentSchema } from './roles'

const notificationLevelValues = Object.values(NOTIFICATION_LEVEL) as [
  NotificationLevel,
  ...NotificationLevel[],
]
const roomClosedReasonValues = Object.values(ROOM_CLOSED_REASON) as [
  RoomClosedReason,
  ...RoomClosedReason[],
]
const sessionEndedReasonValues = Object.values(SESSION_ENDED_REASON) as [
  SessionEndedReason,
  ...SessionEndedReason[],
]

export const notificationLevelSchema = z.enum(notificationLevelValues)
export const roomClosedReasonSchema = z.enum(roomClosedReasonValues)
export const sessionEndedReasonSchema = z.enum(sessionEndedReasonValues)

export const systemReadyEventSchema = z.object({
  message: z.string().min(1).max(200),
}).strict()

export const gameStartedEventSchema = z.object({
  roomRevision: revisionSchema,
  startedAt: timestampSchema,
}).strict()

export const hostDashboardSchema = z.object({
  players: z.array(hostPlayerAssignmentSchema),
  playerCount: z.number().int().positive(),
  werewolfCount: z.number().int().nonnegative(),
  villagerTeamCount: z.number().int().nonnegative(),
}).strict()

export const roomClosedEventSchema = z.object({
  reason: roomClosedReasonSchema,
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
export type RoomClosedEvent = z.infer<typeof roomClosedEventSchema>
export type SessionEndedEvent = z.infer<typeof sessionEndedEventSchema>
export type NotificationEvent = z.infer<typeof notificationEventSchema>
