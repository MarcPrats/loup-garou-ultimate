import { randomUUID } from 'node:crypto'

import type { LobbyId, LobbySnapshot } from '@lgu/contracts'

import { LobbyService } from './lobby-service'

export type LobbyServiceFactory = () => LobbyService

export class LobbyRegistry {
  private readonly lobbies = new Map<LobbyId, LobbyService>()

  constructor(private readonly factory: LobbyServiceFactory) {}

  createLobby(): { lobbyId: LobbyId; service: LobbyService } {
    let lobbyId: LobbyId
    do {
      lobbyId = `loup_garou_${randomUUID().replaceAll('-', '').slice(0, 12)}`
    } while (this.lobbies.has(lobbyId))

    const service = this.factory()
    this.lobbies.set(lobbyId, service)
    return { lobbyId, service }
  }

  get(lobbyId: LobbyId): LobbyService | null {
    return this.lobbies.get(lobbyId) ?? null
  }

  register(lobbyId: LobbyId, service: LobbyService): void {
    this.lobbies.set(lobbyId, service)
  }

  async allLobbyIds(): Promise<LobbyId[]> {
    return [...this.lobbies.keys()]
  }

  async list(): Promise<LobbySnapshot[]> {
    const snapshots = await Promise.all(
      [...this.lobbies.entries()].map(async ([lobbyId, service]) => {
        const snapshot = await service.getLobbySnapshot()
        if (!snapshot || snapshot.phase !== 'lobby' || snapshot.players.length >= snapshot.maximumPlayers) return null
        return { ...snapshot, id: lobbyId }
      }),
    )
    return snapshots.filter((snapshot): snapshot is LobbySnapshot => snapshot !== null)
  }

  async removeIfEmpty(lobbyId: LobbyId): Promise<void> {
    const service = this.lobbies.get(lobbyId)
    if (!service) return
    const snapshot = await service.getLobbySnapshot()
    if (!snapshot || snapshot.players.length === 0 || snapshot.phase === 'closed') {
      this.lobbies.delete(lobbyId)
    }
  }

  async accessRole(roleAccessToken: string) {
    for (const service of this.lobbies.values()) {
      try {
        return await service.accessRole(roleAccessToken)
      } catch {
        // Role access tokens are scoped to a lobby. Continue searching.
      }
    }
    throw new Error('Role access token not found')
  }

  async cleanup(): Promise<void> {
    await Promise.all([...this.lobbies.keys()].map((lobbyId) => this.removeIfEmpty(lobbyId)))
  }
}
