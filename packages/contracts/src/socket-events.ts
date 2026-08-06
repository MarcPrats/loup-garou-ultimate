import type { AckCallback, EmptyResponse } from './acknowledgements'
import type {
  EmptyCommand,
  HostKickCommand,
  RoomCreateCommand,
  RoomEnterCommand,
  RoomJoinCommand,
  SessionResumeCommand,
} from './commands'
import { SOCKET_EVENT } from './constants'
import type {
  GameStartedEvent,
  HostDashboard,
  NotificationEvent,
  RoomClosedEvent,
  SessionEndedEvent,
  SystemReadyEvent,
} from './game'
import type { PrivateAssignment } from './roles'
import type {
  RoomEntryResponse,
  RoomListResponse,
  RoomSnapshot,
  SessionResumeResponse,
} from './room'

export interface ServerToClientEvents {
  [SOCKET_EVENT.SYSTEM_READY]: (event: SystemReadyEvent) => void
  [SOCKET_EVENT.ROOM_SNAPSHOT]: (snapshot: RoomSnapshot) => void
  [SOCKET_EVENT.GAME_STARTED]: (event: GameStartedEvent) => void
  [SOCKET_EVENT.PRIVATE_ASSIGNMENT]: (assignment: PrivateAssignment) => void
  [SOCKET_EVENT.HOST_DASHBOARD]: (dashboard: HostDashboard) => void
  [SOCKET_EVENT.ROOM_CLOSED]: (event: RoomClosedEvent) => void
  [SOCKET_EVENT.SESSION_ENDED]: (event: SessionEndedEvent) => void
  [SOCKET_EVENT.NOTIFICATION]: (event: NotificationEvent) => void
}

export interface ClientToServerEvents {
  [SOCKET_EVENT.ROOM_LIST]: (
    command: EmptyCommand,
    callback: AckCallback<RoomListResponse>,
  ) => void
  [SOCKET_EVENT.ROOM_CREATE]: (
    command: RoomCreateCommand,
    callback: AckCallback<RoomEntryResponse>,
  ) => void
  [SOCKET_EVENT.ROOM_JOIN]: (
    command: RoomJoinCommand,
    callback: AckCallback<RoomEntryResponse>,
  ) => void
  [SOCKET_EVENT.ROOM_ENTER]: (
    command: RoomEnterCommand,
    callback: AckCallback<RoomEntryResponse>,
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
    callback: AckCallback<RoomSnapshot>,
  ) => void
  [SOCKET_EVENT.GAME_START]: (
    command: EmptyCommand,
    callback: AckCallback<EmptyResponse>,
  ) => void
  [SOCKET_EVENT.KEEP_ALIVE]: (
    command: EmptyCommand,
    callback: AckCallback<EmptyResponse>,
  ) => void
}
