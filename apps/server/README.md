# V3 server

The V3 server is being migrated in layers.

## Current layers

- `domain/`: room/session state and domain errors.
- `application/`: lobby use cases and public snapshot mapping.
- `infrastructure/`: serialized in-memory repository and production clock/ID generators.
- `config/`: lifecycle time limits.

`LobbyService` is transport-independent. Socket.IO handlers will validate contract payloads, call this service and emit the returned snapshots in the next step.

## Important invariants

- Socket IDs are connection IDs, never player identities.
- Player IDs and session tokens are server generated.
- The first entrant becomes game master.
- The room supports 12 non-host players.
- Five connected non-host players are required to start.
- Disconnected players retain their session and room slot for five minutes.
- Host disconnect does not immediately destroy a game; explicit host leave after start closes it.
- Every public mutation increments the room revision once.
- Keep-alive and same-session socket replacement do not increment the public revision.
- Public snapshots never expose session tokens or connection IDs.
