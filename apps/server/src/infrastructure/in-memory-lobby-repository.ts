import type {
  LobbyState,
  LobbyMutation,
  LobbyRepository,
} from '../domain/lobby-types'

function cloneLobby(lobby: LobbyState | null): LobbyState | null {
  return lobby ? structuredClone(lobby) : null
}

export class InMemoryLobbyRepository implements LobbyRepository {
  private lobby: LobbyState | null = null
  private mutationQueue: Promise<void> = Promise.resolve()

  async read(): Promise<LobbyState | null> {
    await this.mutationQueue
    return cloneLobby(this.lobby)
  }

  mutate<T>(
    operation: (
      lobby: LobbyState | null,
    ) => LobbyMutation<T> | Promise<LobbyMutation<T>>,
  ): Promise<T> {
    const mutation = this.mutationQueue.then(async () => {
      const transition = await operation(cloneLobby(this.lobby))
      this.lobby = cloneLobby(transition.lobby)
      return transition.result
    })

    this.mutationQueue = mutation.then(
      () => undefined,
      () => undefined,
    )

    return mutation
  }
}
