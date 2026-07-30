import { z } from 'zod'

import { ERROR_CODE, type ErrorCode } from './constants'

const errorCodeValues = Object.values(ERROR_CODE) as [ErrorCode, ...ErrorCode[]]

export const errorCodeSchema = z.enum(errorCodeValues)

export const publicErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string().min(1).max(300),
  field: z.string().min(1).max(100).optional(),
}).strict()

export type PublicError = z.infer<typeof publicErrorSchema>
