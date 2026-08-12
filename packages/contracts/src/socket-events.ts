import type { AckCallback, EmptyResponse } from './acknowledgements'
import type {
  EmptyCommand,
  GamePhaseAdvanceCommand,
  HostKickCommand,
  LobbyCreateCommand,
  LobbyEnterCommand,
  LobbyJoinCommand,
  SessionResumeCommand,
} from './commands'
import type {
  DayNominationDecisionCommand,
  DayNominationProposeCommand,
  DayVoteSubmitCommand,
} from './day-voting'
import { SOCKET_EVENT } from './constants'
import type {
  GameLogDeleteCommand,
  GameLogEditCommand,
  GameLogRecordCommand,
} from './game-log'
import type {
  GameStartedEvent,
  GameStartPreview,
  HostDashboard,
  NotificationEvent,
  LobbyClosedEvent,
  SessionEndedEvent,
  SystemReadyEvent,
} from './game'
import type { PrivateAssignment } from './roles'
import type {
  LobbyEntryResponse,
  LobbyListResponse,
  LobbySnapshot,
  SessionResumeResponse,
} from './lobby'

export interface ServerToClientEvents {
  [SOCKET_EVENT.SYSTEM_READY]: (event: SystemReadyEvent) => void
  [SOCKET_EVENT.LOBBY_SNAPSHOT]: (snapshot: LobbySnapshot) => void
  [SOCKET_EVENT.GAME_STARTED]: (event: GameStartedEvent) => void
  [SOCKET_EVENT.PRIVATE_ASSIGNMENT]: (assignment: PrivateAssignment) => void
  [SOCKET_EVENT.HOST_DASHBOARD]: (dashboard: HostDashboard) => void
  [SOCKET_EVENT.HOST_START_PREVIEW]: (preview: GameStartPreview) => void
  [SOCKET_EVENT.LOBBY_CLOSED]: (event: LobbyClosedEvent) => void
  [SOCKET_EVENT.SESSION_ENDED]: (event: SessionEndedEvent) => void
  [SOCKET_EVENT.NOTIFICATION]: (event: NotificationEvent) => void
}

export interface ClientToServerEvents {
  [SOCKET_EVENT.LOBBY_LIST]: (
    command: EmptyCommand,
    callback: AckCallback<LobbyListResponse>,
  ) => void
  [SOCKET_EVENT.LOBBY_CREATE]: (
    command: LobbyCreateCommand,
    callback: AckCallback<LobbyEntryResponse>,
  ) => void
  [SOCKET_EVENT.LOBBY_JOIN]: (
    command: LobbyJoinCommand,
    callback: AckCallback<LobbyEntryResponse>,
  ) => void
  [SOCKET_EVENT.LOBBY_ENTER]: (
    command: LobbyEnterCommand,
    callback: AckCallback<LobbyEntryResponse>,
  ) => void
  [SOCKET_EVENT.SESSION_RESUME]: (
    command: SessionResumeCommand,
    callback: AckCallback<SessionResumeResponse>,
  ) => void
  [SOCKET_EVENT.PLAYER_LEAVE]: (
    command: EmptyCommand,
    callback: AckCallback<EmptyResponse>,
  ) => void
  [SOCKET_EVENT.HOST_KICK]: (
    command: HostKickCommand,
    callback: AckCallback<LobbySnapshot>,
  ) => void
  [SOCKET_EVENT.GAME_START]: (
    command: EmptyCommand,
    callback: AckCallback<GameStartPreview>,
  ) => void
  [SOCKET_EVENT.GAME_START_CONFIRM]: (
    command: EmptyCommand,
    callback: AckCallback<EmptyResponse>,
  ) => void
  [SOCKET_EVENT.GAME_START_CANCEL]: (
    command: EmptyCommand,
    callback: AckCallback<EmptyResponse>,
  ) => void
  [SOCKET_EVENT.GAME_START_REDISTRIBUTE]: (
    command: EmptyCommand,
    callback: AckCallback<GameStartPreview>,
  ) => void
  [SOCKET_EVENT.GAME_PHASE_ADVANCE]: (
    command: GamePhaseAdvanceCommand,
    callback: AckCallback<LobbySnapshot>,
  ) => void
  [SOCKET_EVENT.GAME_PHASE_REWIND]: (
    command: GamePhaseAdvanceCommand,
    callback: AckCallback<LobbySnapshot>,
  ) => void
  [SOCKET_EVENT.GAME_LOG_RECORD]: (
    command: GameLogRecordCommand,
    callback: AckCallback<LobbySnapshot>,
  ) => void
  [SOCKET_EVENT.GAME_LOG_EDIT]: (
    command: GameLogEditCommand,
    callback: AckCallback<LobbySnapshot>,
  ) => void
  [SOCKET_EVENT.GAME_LOG_DELETE]: (
    command: GameLogDeleteCommand,
    callback: AckCallback<LobbySnapshot>,
  ) => void
  [SOCKET_EVENT.DAY_NOMINATION_PROPOSE]: (
    command: DayNominationProposeCommand,
    callback: AckCallback<LobbySnapshot>,
  ) => void
  [SOCKET_EVENT.DAY_NOMINATION_APPROVE]: (
    command: DayNominationDecisionCommand,
    callback: AckCallback<LobbySnapshot>,
  ) => void
  [SOCKET_EVENT.DAY_NOMINATION_REJECT]: (
    command: DayNominationDecisionCommand,
    callback: AckCallback<LobbySnapshot>,
  ) => void
  [SOCKET_EVENT.DAY_VOTE_SUBMIT]: (
    command: DayVoteSubmitCommand,
    callback: AckCallback<LobbySnapshot>,
  ) => void
  [SOCKET_EVENT.DAY_VOTE_START]: (
    command: DayNominationDecisionCommand,
    callback: AckCallback<LobbySnapshot>,
  ) => void
  [SOCKET_EVENT.KEEP_ALIVE]: (
    command: EmptyCommand,
    callback: AckCallback<EmptyResponse>,
  ) => void
}
