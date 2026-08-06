# `@lgu/contracts`

Runtime-validated contracts shared by the Vue client and Fastify/Socket.IO server.

## Principles

- Every network payload has a Zod schema and an inferred TypeScript type.
- Socket.IO event names, error codes, states and route names use exported constants.
- Client commands never contain `isHost`; host status is decided by the server session.
- Public lobby snapshots contain no role information.
- Private player assignments cannot contain `isDrunk` or `isVoyanteDecoy`.
- The MJ dashboard has a separate schema containing hidden game information.
- Role IDs are opaque transport strings. The server maps `@lgu/game-core` definitions to wire DTOs.

The event interfaces describe the target V3 protocol. Lobby handlers are implemented in the following migration step.
