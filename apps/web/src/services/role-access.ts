import {
  API_ROUTE,
  publicErrorSchema,
  roleAccessResponseSchema,
  type RoleAccessResponse,
} from '@lgu/contracts'

export class RoleAccessError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'RoleAccessError'
  }
}

export async function fetchRoleAccess(
  token: string,
  signal?: AbortSignal,
): Promise<RoleAccessResponse> {
  const response = await fetch(
    `${API_ROUTE.ROLE_ACCESS_PREFIX}/${encodeURIComponent(token)}`,
    {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    },
  )
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new RoleAccessError(
      'Le serveur a renvoyé une réponse illisible.',
      response.status || 502,
    )
  }
  if (!response.ok) {
    const publicError = publicErrorSchema.safeParse(body)
    throw new RoleAccessError(
      publicError.success
        ? publicError.data.message
        : 'Ce lien privé est invalide ou a expiré.',
      response.status,
    )
  }
  const parsed = roleAccessResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new RoleAccessError('La vue privée reçue est invalide.', 502)
  }
  return parsed.data
}
