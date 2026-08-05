# V3 Feature Parity and Privacy Audit

## User-facing parity

- Three-action menu, ordering, labels, links, and visual language.
- V3 `/waiting_room` entry aliases and player-name flow.
- Invitation link, roster, host badge, kick, start, rules, waiting, and leave controls.
- Complete player role artwork, team, power, additional information, bluff role, bluff power/information, and role-specific clues.
- Complete MJ player/role/team table with hidden Ivrogne, Voyante-decoy, bluff, Renard, and Petite Fille information.
- Vue rules reference, Vue character detail pages, and V3-owned image assets.
- Session restoration across reloads and private direct-access links.
- Deterministic 5 to 12 player simulator using production contracts, projections, and display components.

## Privacy boundaries

- Public room DTOs contain roster and game state, not roles or tokens.
- Player assignment DTOs do not contain `isDrunk` or `isVoyanteDecoy`.
- MJ dashboard DTOs contain the complete hidden state.
- Bearer role tokens are stored in URL fragments, never query parameters or paths.
- Direct private requests use `cache: no-store`, `credentials: omit`, and `Referrer-Policy: no-referrer`.
- Unknown and missing API routes never fall through to the Vue application.
- Simulator data is synthetic, local, non-persistent, and disconnected from Socket.IO and APIs.

## Automated acceptance

The Vitest suites validate contracts, assignment rules, projections, server transport, token access, session recovery, race handling, UI components, production simulator exclusion, static routing, and shutdown.

Playwright validates the production build with six separate browser contexts, full room progression, reload restoration, private fragment access, API response headers, absence of hidden fields from player JSON, rules/character pages, and simulator network/storage isolation.
