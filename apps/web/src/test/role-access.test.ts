import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ERROR_CODE,
  ROLE_ACCESS_VIEW,
  ROLE_CATEGORY,
  TEAM,
} from '@lgu/contracts'
import { ROLE_ID } from '@lgu/game-core'

import {
  RoleAccessError,
  fetchRoleAccess,
} from '../services/role-access'

const TOKEN = 'role_00000000000000000000000000000000001'
const ASSIGNMENT_RESPONSE = {
  view: ROLE_ACCESS_VIEW.PLAYER,
  assignment: {
    player: { id: 'player_1', name: 'Marc' },
    role: {
      id: ROLE_ID.RENARD,
      team: TEAM.VILLAGERS,
      category: ROLE_CATEGORY.VILLAGER,
    },
    roleAccessToken: TOKEN,
    bluffRoleId: null,
    specialInformation: null,
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchRoleAccess', () => {
  it('uses a no-store, credential-free, no-referrer request and validates the DTO', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ASSIGNMENT_RESPONSE,
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchRoleAccess(TOKEN)).resolves.toEqual(ASSIGNMENT_RESPONSE)
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/role/${TOKEN}`,
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      }),
    )
  })

  it('maps typed public errors without exposing response internals', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        code: ERROR_CODE.INVALID_ROLE_TOKEN,
        message: 'Le lien de rôle est invalide.',
      }),
    }))

    const request = fetchRoleAccess(TOKEN)
    await expect(request).rejects.toBeInstanceOf(RoleAccessError)
    await expect(request).rejects.toMatchObject({
      message: 'Le lien de rôle est invalide.',
      status: 404,
    })
  })
})
