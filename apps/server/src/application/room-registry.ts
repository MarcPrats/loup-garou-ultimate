import { randomUUID } from 'node:crypto'

import type { RoomId, RoomSnapshot } from '@lgu/contracts'

import { LobbyService } from './lobby-service'

export type LobbyServiceFactory = () => LobbyService

export class RoomRegistry {
  private readonly rooms = new Map<RoomId, LobbyService>()

  constructor(private readonly factory: LobbyServiceFactory) {}

  createRoom(): { roomId: RoomId; service: LobbyService } {
    let roomId: RoomId
    do {
      roomId = `room_${randomUUID().replaceAll('-', '').slice(0, 12)}`
    } while (this.rooms.has(roomId))

    const service = this.factory()
    this.rooms.set(roomId, service)
    return { roomId, service }
  }

  get(roomId: RoomId): LobbyService | null {
    return this.rooms.get(roomId) ?? null
  }

  register(roomId: RoomId, service: LobbyService): void {
    this.rooms.set(roomId, service)
  }

  async allRoomIds(): Promise<RoomId[]> {
    return [...this.rooms.keys()]
  }

  async list(): Promise<RoomSnapshot[]> {
    const snapshots = await Promise.all(
      [...this.rooms.entries()].map(async ([roomId, service]) => {
        const snapshot = await service.getRoomSnapshot()
        if (!snapshot || snapshot.phase !== 'lobby' || snapshot.players.length >= snapshot.maximumPlayers) return null
        return { ...snapshot, id: roomId }
      }),
    )
    return snapshots.filter((snapshot): snapshot is RoomSnapshot => snapshot !== null)
  }

  async removeIfEmpty(roomId: RoomId): Promise<void> {
    const service = this.rooms.get(roomId)
    if (!service) return
    const snapshot = await service.getRoomSnapshot()
    if (!snapshot || snapshot.players.length === 0 || snapshot.phase === 'closed') {
      this.rooms.delete(roomId)
    }
  }

  async accessRole(roleAccessToken: string) {
    for (const service of this.rooms.values()) {
      try {
        return await service.accessRole(roleAccessToken)
      } catch {
        // Role access tokens are scoped to a room. Continue searching.
      }
    }
    throw new Error('Role access token not found')
  }

  async cleanup(): Promise<void> {
    await Promise.all([...this.rooms.keys()].map((roomId) => this.removeIfEmpty(roomId)))
  }
}
