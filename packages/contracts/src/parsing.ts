import type { output, ZodType } from 'zod'

export function parseContract<TSchema extends ZodType>(
  schema: TSchema,
  value: unknown,
): output<TSchema> {
  return schema.parse(value)
}

export function safeParseContract<TSchema extends ZodType>(
  schema: TSchema,
  value: unknown,
) {
  return schema.safeParse(value)
}
