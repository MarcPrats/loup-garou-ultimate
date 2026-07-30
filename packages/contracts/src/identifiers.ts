import { z } from 'zod'

import { ROOM_ID } from './constants'

const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]+$/
const ROLE_IDENTIFIER_PATTERN = /^[a-z0-9-]+$/

export const playerIdSchema = z.string().trim().min(1).max(128).regex(SAFE_IDENTIFIER_PATTERN)
export const sessionTokenSchema = z.string().trim().min(32).max(256).regex(SAFE_IDENTIFIER_PATTERN)
export const roleAccessTokenSchema = z.string().trim().min(32).max(256).regex(SAFE_IDENTIFIER_PATTERN)
export const simulatorGameIdSchema = z.string().trim().min(1).max(128).regex(SAFE_IDENTIFIER_PATTERN)
export const roleIdSchema = z.string().trim().min(1).max(64).regex(ROLE_IDENTIFIER_PATTERN)
export const playerNameSchema = z.string().trim().min(1).max(40)
export const roomIdSchema = z.literal(ROOM_ID.MAIN)
export const timestampSchema = z.number().int().nonnegative()
export const revisionSchema = z.number().int().nonnegative()

export type PlayerId = z.infer<typeof playerIdSchema>
export type SessionToken = z.infer<typeof sessionTokenSchema>
export type RoleAccessToken = z.infer<typeof roleAccessTokenSchema>
export type SimulatorGameId = z.infer<typeof simulatorGameIdSchema>
export type RoleId = z.infer<typeof roleIdSchema>
export type PlayerName = z.infer<typeof playerNameSchema>
export type RoomId = z.infer<typeof roomIdSchema>
