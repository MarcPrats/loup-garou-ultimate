import type {
  LobbyRoomState,
  RoomMutation,
  RoomRepository,
} from '../domain/lobby-types'

function cloneRoom(room: LobbyRoomState | null): LobbyRoomState | null {
  return room ? structuredClone(room) : null
}

export class InMemoryRoomRepository implements RoomRepository {
  private room: LobbyRoomState | null = null
  private mutationQueue: Promise<void> = Promise.resolve()

  async read(): Promise<LobbyRoomState | null> {
    await this.mutationQueue
    return cloneRoom(this.room)
  }

  mutate<T>(
    operation: (
      room: LobbyRoomState | null,
    ) => RoomMutation<T> | Promise<RoomMutation<T>>,
  ): Promise<T> {
    const mutation = this.mutationQueue.then(async () => {
      const transition = await operation(cloneRoom(this.room))
      this.room = cloneRoom(transition.room)
      return transition.result
    })

    this.mutationQueue = mutation.then(
      () => undefined,
      () => undefined,
    )

    return mutation
  }
}
