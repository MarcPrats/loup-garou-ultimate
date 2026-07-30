import { z } from 'zod'

import { publicErrorSchema, type PublicError } from './errors'

export interface AckSuccess<T> {
  readonly ok: true
  readonly data: T
}

export interface AckFailure {
  readonly ok: false
  readonly error: PublicError
}

export type Ack<T> = AckSuccess<T> | AckFailure
export type AckCallback<T> = (response: Ack<T>) => void

export const emptyResponseSchema = z.object({}).strict()
export type EmptyResponse = z.infer<typeof emptyResponseSchema>

export function createAckSchema<TSchema extends z.ZodType>(dataSchema: TSchema) {
  return z.discriminatedUnion('ok', [
    z.object({
      ok: z.literal(true),
      data: dataSchema,
    }).strict(),
    z.object({
      ok: z.literal(false),
      error: publicErrorSchema,
    }).strict(),
  ])
}

export function ackSuccess<T>(data: T): AckSuccess<T> {
  return { ok: true, data }
}

export function ackFailure(error: PublicError): AckFailure {
  return { ok: false, error }
}
