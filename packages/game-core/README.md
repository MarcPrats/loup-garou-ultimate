# `@lgu/game-core`

Pure TypeScript domain rules for Loup Garou Ultimate.

The package has no dependency on Vue, Fastify, Socket.IO, browser APIs or process-wide state. Callers provide players and a `RandomSource`; the package returns role IDs, hidden modifiers and special information using player IDs.

## Modules

- `constants.ts`: player-count rules, outsider modes and special-information constants.
- `roles.ts`: canonical role IDs, teams, categories and reusable role predicates.
- `game-setup.ts`: player validation, werewolf count, outsider selection, role-pool creation and Ivrogne selection.
- `player-assignments.ts`: role lookup and player-assignment helpers.
- `special-information.ts`: Renard, Petite Fille and Voyante rules.
- `bluffs.ts`: Loup Garou bluff roles and fake special information.
- `assign-roles.ts`: short orchestration function preserving the seeded random-operation order.
- `random.ts`: injectable random selection and shuffling utilities.

## Current responsibility

- Validate the supported 5 to 12 player setup.
- Assign two or three Loups Garous.
- Select the configured number of Marginaux from an extensible pool: 0 at 5/7/10 players, 1 at 6/8/11, and 2 at 9/12.
- - Build Renard and Petite Fille information.
- Select the Voyante decoy.
- Assign unused bluff roles to Loups Garous.
- Generate Renard and Petite Fille bluff information.

The V3 server uses this package directly. The deterministic assignment tests protect the seeded algorithm used by the shared game engine.
