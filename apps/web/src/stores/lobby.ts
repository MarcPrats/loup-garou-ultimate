import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ROLE_ID } from '@lgu/game-core'

import {
  ERROR_CODE,
  LOBBY_ID,
  NOTIFICATION_LEVEL,
  LOBBY_PHASE,
  SESSION_DESTINATION,
  type ErrorCode,
  type GameLogEventType,
  type GameStartPreview,
  type HostDashboard,
  type NotificationLevel,
  type PlayerId,
  type PrivateAssignment,
  type PublicError,
  type PublicPlayer,
  type LobbySnapshot,
  type SessionCredentials,
  type SessionDestination,
} from '@lgu/contracts'

import {
  CLIENT_TIMING,
  CONNECTION_STATE,
  type ConnectionState,
} from '../constants/app'
import {
  GatewayTimeoutError,
  getLobbyGateway,
  type LobbyGateway,
} from '../services/lobby-gateway'
import {
  browserSessionStorage,
  type SessionStorage,
} from '../services/session-storage'

const MESSAGE = {
  CONNECTION_FAILED: 'Connexion au serveur impossible. Réessayez dans un instant.',
  COMMAND_TIMEOUT: 'Le serveur met trop de temps à répondre. Réessayez.',
  GAME_STARTED: 'La partie commence !',
  SESSION_RESTORED: 'Session restaurée.',
  LINK_COPIED: 'Lien d’invitation copié.',
  PROTOCOL_ERROR: 'Le serveur a envoyé une réponse invalide. Reconnexion en cours.',
  LOBBY_UNAVAILABLE: 'Cette partie n’est plus disponible. Choisissez une autre lobby.',
} as const

const TERMINAL_SESSION_ERRORS = new Set<ErrorCode>([
  ERROR_CODE.SESSION_NOT_FOUND,
  ERROR_CODE.LOBBY_CLOSED,
  ERROR_CODE.LOBBY_NOT_FOUND,
])

export interface LobbyNotice {
  readonly id: number
  readonly level: NotificationLevel
  readonly message: string
}

export interface LobbyStoreDependencies {
  readonly getGateway: () => LobbyGateway
  readonly storage: SessionStorage
}

export function createLobbyStoreDefinition(
  storeId: string,
  dependencies: LobbyStoreDependencies,
) {
  return defineStore(storeId, () => {
    const connectionState = ref<ConnectionState>(CONNECTION_STATE.OFFLINE)
    const initialized = ref(false)
    const credentials = ref<SessionCredentials | null>(
      dependencies.storage.load(),
    )
    const lobby = ref<LobbySnapshot | null>(null)
    const availableLobbies = ref<LobbySnapshot[]>([])
    const destination = ref<SessionDestination | null>(null)
    const privateAssignment = ref<PrivateAssignment | null>(null)
    const hostDashboard = ref<HostDashboard | null>(null)
    const startPreview = ref<GameStartPreview | null>(null)
    const pendingHostDashboard = ref<HostDashboard | null>(null)
    const error = ref<PublicError | null>(null)
    const notice = ref<LobbyNotice | null>(null)
    const restoringSession = ref(credentials.value !== null)
    const entering = ref(false)
    const leaving = ref(false)
    const starting = ref(false)
    const advancingPhase = ref(false)
    const updatingGameLog = ref(false)
    const kickingPlayerId = ref<PlayerId | null>(null)

    let initializePromise: Promise<void> | null = null
    let resumePromise: Promise<void> | null = null
    let unsubscribe: (() => void) | null = null
    let keepAliveTimer: number | null = null
    let noticeTimer: number | null = null
    let noticeId = 0
    let sessionEpoch = 0
    let privateRecoveryTimer: number | null = null
    let retiringSession = false
    let realtimeSuspended = false
    let realtimeEpoch = 0

    const currentPlayer = computed<PublicPlayer | null>(() => {
      if (!credentials.value || !lobby.value) return null
      return lobby.value.players.find(
        (player) => player.id === credentials.value?.playerId,
      ) ?? null
    })
    const isHost = computed(() => currentPlayer.value?.isHost ?? false)
    const host = computed(() => (
      lobby.value?.players.find((player) => player.isHost) ?? null
    ))
    const regularPlayers = computed(() => (
      lobby.value?.players.filter((player) => !player.isHost) ?? []
    ))
    const connectedRegularPlayerCount = computed(() => (
      regularPlayers.value.filter((player) => player.connected).length
    ))
    const hasStoredSession = computed(() => credentials.value !== null)
    const hasSession = computed(() => (
      credentials.value !== null && lobby.value !== null
    ))
    const isLobby = computed(() => lobby.value?.phase === LOBBY_PHASE.LOBBY)

    function getGateway(): LobbyGateway {
      return dependencies.getGateway()
    }

    function clearError(): void {
      error.value = null
    }

    function showNotice(
      level: NotificationLevel,
      message: string,
    ): void {
      noticeId += 1
      notice.value = { id: noticeId, level, message }
      if (noticeTimer !== null) window.clearTimeout(noticeTimer)
      noticeTimer = window.setTimeout(() => {
        notice.value = null
        noticeTimer = null
      }, CLIENT_TIMING.NOTICE_DURATION_MS)
    }

    function showCopiedNotice(): void {
      showNotice(NOTIFICATION_LEVEL.SUCCESS, MESSAGE.LINK_COPIED)
    }

    function setCommandError(caught: unknown): void {
      if (caught instanceof GatewayTimeoutError) {
        error.value = {
          code: ERROR_CODE.INTERNAL_ERROR,
          message: MESSAGE.COMMAND_TIMEOUT,
        }
        return
      }
      error.value = {
        code: ERROR_CODE.INTERNAL_ERROR,
        message: MESSAGE.CONNECTION_FAILED,
      }
    }

    function applyLobbySnapshot(snapshot: LobbySnapshot): void {
      if (!credentials.value || !lobby.value) return
      if (snapshot.createdAt !== lobby.value.createdAt) return
      if (snapshot.revision < lobby.value.revision) return
      lobby.value = snapshot
      if (snapshot.phase === LOBBY_PHASE.STARTED) schedulePrivateViewRecovery()
      if (snapshot.phase === LOBBY_PHASE.STARTED) startPreview.value = null
      if (hostDashboard.value) {
        const connectionById = new Map(
          snapshot.players.map((player) => [player.id, player.connected]),
        )
        hostDashboard.value = {
          ...hostDashboard.value,
          players: hostDashboard.value.players.map((assignment) => ({
            ...assignment,
            player: {
              ...assignment.player,
              connected: connectionById.get(assignment.player.id)
                ?? assignment.player.connected,
            },
          })),
        }
      }
    }

    function saveSession(
      session: SessionCredentials,
      nextLobby: LobbySnapshot,
      nextDestination: SessionDestination,
    ): void {
      if (credentials.value?.sessionToken !== session.sessionToken) {
        sessionEpoch += 1
      }
      credentials.value = session
      dependencies.storage.save(session)
      lobby.value = nextLobby
      destination.value = nextDestination
      startPreview.value = null
      restoringSession.value = false
      updatingGameLog.value = false
      if (pendingHostDashboard.value) {
        const canViewDashboard = currentPlayer.value?.isHost
          || privateAssignment.value?.role.id === ROLE_ID.LOUP_BLANC
        if (canViewDashboard) {
          hostDashboard.value = pendingHostDashboard.value
          pendingHostDashboard.value = null
          cancelPrivateViewRecovery()
        }
      }
      if (nextLobby.phase === LOBBY_PHASE.STARTED) schedulePrivateViewRecovery()
      startKeepAlive()
    }

    function clearSession(): void {
      sessionEpoch += 1
      credentials.value = null
      lobby.value = null
      destination.value = null
      privateAssignment.value = null
      hostDashboard.value = null
      startPreview.value = null
      pendingHostDashboard.value = null
      restoringSession.value = false
      dependencies.storage.clear()
      stopKeepAlive()
      cancelPrivateViewRecovery()
    }

    function handleAckError(publicError: PublicError): void {
      if (publicError.message === 'Cette connexion possède déjà une session active.') {
        error.value = null
        return
      }
      error.value = TERMINAL_SESSION_ERRORS.has(publicError.code)
        ? { ...publicError, message: MESSAGE.LOBBY_UNAVAILABLE }
        : publicError
      if (TERMINAL_SESSION_ERRORS.has(publicError.code)) clearSession()
    }

    async function resumeStoredSession(): Promise<void> {
      if (
        realtimeSuspended
        || !credentials.value
        || connectionState.value !== CONNECTION_STATE.ONLINE
      ) {
        return
      }
      if (resumePromise) return resumePromise

      const expectedEpoch = sessionEpoch
      const expectedRealtimeEpoch = realtimeEpoch
      const expectedToken = credentials.value.sessionToken
      const expectedLobbyId = credentials.value.lobbyId ?? LOBBY_ID.MAIN
      restoringSession.value = true
      resumePromise = (async () => {
        try {
          const response = await getGateway().resume(expectedToken, expectedLobbyId)
          if (
            realtimeSuspended
            || realtimeEpoch !== expectedRealtimeEpoch
            || sessionEpoch !== expectedEpoch
            || credentials.value?.sessionToken !== expectedToken
          ) return
          if (!response.ok) {
            handleAckError(response.error)
            return
          }
          saveSession(
            response.data.session,
            response.data.lobby,
            response.data.destination,
          )
          clearError()
          showNotice(NOTIFICATION_LEVEL.SUCCESS, MESSAGE.SESSION_RESTORED)
        } catch (caught) {
          if (
            !realtimeSuspended
            && realtimeEpoch === expectedRealtimeEpoch
            && sessionEpoch === expectedEpoch
            && credentials.value?.sessionToken === expectedToken
          ) {
            setCommandError(caught)
          }
        } finally {
          if (
            realtimeEpoch === expectedRealtimeEpoch
            && sessionEpoch === expectedEpoch
          ) restoringSession.value = false
          resumePromise = null
        }
      })()

      return resumePromise
    }

    function handleConnectionState(state: ConnectionState): void {
      if (realtimeSuspended) {
        connectionState.value = CONNECTION_STATE.OFFLINE
        if (state === CONNECTION_STATE.ONLINE) getGateway().disconnect()
        return
      }
      connectionState.value = state
      if (state === CONNECTION_STATE.ONLINE) {
        if (!credentials.value) clearError()
        startKeepAlive()
        if (initialized.value && !retiringSession) void resumeStoredSession()
      } else {
        stopKeepAlive()
      }
    }

    function registerGatewayHandlers(): void {
      if (unsubscribe) return
      unsubscribe = getGateway().subscribe({
        onConnectionState: handleConnectionState,
        onSystemReady: () => {
          handleConnectionState(CONNECTION_STATE.ONLINE)
        },
        onLobbySnapshot: (snapshot) => {
          if (!realtimeSuspended) applyLobbySnapshot(snapshot)
        },
        onGameStarted: () => {
          if (realtimeSuspended) return
          startPreview.value = null
          showNotice(NOTIFICATION_LEVEL.SUCCESS, MESSAGE.GAME_STARTED)
        },
        onPrivateAssignment: (assignment) => {
          if (realtimeSuspended) return
          if (assignment.player.id !== credentials.value?.playerId) return
          privateAssignment.value = assignment
          destination.value = SESSION_DESTINATION.PLAYER_ROLE
          cancelPrivateViewRecovery()
        },
        onHostDashboard: (dashboard) => {
          if (realtimeSuspended) return
          const isLoupBlanc = privateAssignment.value?.role.id === ROLE_ID.LOUP_BLANC
          if (!currentPlayer.value?.isHost && !isLoupBlanc) {
            pendingHostDashboard.value = dashboard
            return
          }
          hostDashboard.value = dashboard
          if (!isLoupBlanc) destination.value = SESSION_DESTINATION.GAME_MASTER
          cancelPrivateViewRecovery()
        },
        onStartPreview: (preview) => {
          if (realtimeSuspended || !currentPlayer.value?.isHost) return
          startPreview.value = preview
        },
        onLobbyClosed: (event) => {
          if (realtimeSuspended) return
          clearSession()
          showNotice(NOTIFICATION_LEVEL.ERROR, event.message)
        },
        onSessionEnded: (event) => {
          if (realtimeSuspended) return
          clearSession()
          showNotice(NOTIFICATION_LEVEL.WARNING, event.message)
        },
        onNotification: (event) => {
          if (realtimeSuspended) return
          showNotice(event.level, event.message)
        },
        onProtocolError: () => {
          if (realtimeSuspended) return
          error.value = {
            code: ERROR_CODE.INTERNAL_ERROR,
            message: MESSAGE.PROTOCOL_ERROR,
          }
          void getGateway().reconnect().catch(setCommandError)
        },
      })
    }

    function initialize(): Promise<void> {
      if (initializePromise) return initializePromise

      const expectedRealtimeEpoch = realtimeEpoch
      initializePromise = (async () => {
        registerGatewayHandlers()
        connectionState.value = CONNECTION_STATE.CONNECTING
        try {
          await getGateway().connect()
          if (
            realtimeSuspended
            || realtimeEpoch !== expectedRealtimeEpoch
          ) {
            getGateway().disconnect()
            return
          }
          connectionState.value = CONNECTION_STATE.ONLINE
          await resumeStoredSession()
        } catch (caught) {
          if (
            !realtimeSuspended
            && realtimeEpoch === expectedRealtimeEpoch
          ) {
            connectionState.value = CONNECTION_STATE.ERROR
            setCommandError(caught)
          }
        } finally {
          initialized.value = true
        }
      })()

      return initializePromise
    }

    async function listLobbies(): Promise<boolean> {
      clearError()
      try {
        const response = await getGateway().listLobbies()
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        availableLobbies.value = response.data
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      }
    }

    async function createLobby(playerName: string): Promise<boolean> {
      clearError()
      try {
        const response = await getGateway().createLobby(playerName)
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        saveSession(response.data.session, response.data.lobby, response.data.destination)
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      }
    }

    async function joinLobby(lobbyId: string, playerName: string): Promise<boolean> {
      clearError()
      try {
        const response = await getGateway().joinLobby(lobbyId, playerName)
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        saveSession(response.data.session, response.data.lobby, response.data.destination)
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      }
    }

    async function enter(playerName: string): Promise<boolean> {
      if (credentials.value) return false
      const expectedEpoch = sessionEpoch
      entering.value = true
      clearError()
      try {
        const response = await getGateway().enter(playerName.trim())
        if (sessionEpoch !== expectedEpoch || credentials.value) return false
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        saveSession(
          response.data.session,
          response.data.lobby,
          response.data.destination,
        )
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      } finally {
        entering.value = false
      }
    }

    async function leave(): Promise<boolean> {
      const expectedEpoch = sessionEpoch
      leaving.value = true
      clearError()
      try {
        const response = await getGateway().leave()
        if (sessionEpoch !== expectedEpoch) return false
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        clearSession()
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      } finally {
        leaving.value = false
      }
    }

    async function kick(playerId: PlayerId): Promise<boolean> {
      const expectedEpoch = sessionEpoch
      kickingPlayerId.value = playerId
      clearError()
      try {
        const response = await getGateway().kick(playerId)
        if (sessionEpoch !== expectedEpoch) return false
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        applyLobbySnapshot(response.data)
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      } finally {
        kickingPlayerId.value = null
      }
    }

    async function start(): Promise<boolean> {
      const expectedEpoch = sessionEpoch
      starting.value = true
      clearError()
      try {
        const response = await getGateway().start()
        if (sessionEpoch !== expectedEpoch) return false
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        startPreview.value = response.data
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      } finally {
        starting.value = false
      }
    }

    async function confirmStart(): Promise<boolean> {
      const expectedEpoch = sessionEpoch
      starting.value = true
      clearError()
      try {
        const response = await getGateway().confirmStart()
        if (sessionEpoch !== expectedEpoch) return false
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        startPreview.value = null
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      } finally {
        starting.value = false
      }
    }

    async function cancelStartPreview(): Promise<boolean> {
      const expectedEpoch = sessionEpoch
      starting.value = true
      clearError()
      try {
        const response = await getGateway().cancelStartPreview()
        if (sessionEpoch !== expectedEpoch) return false
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        startPreview.value = null
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      } finally {
        starting.value = false
      }
    }

    async function redistributeStartPreview(): Promise<boolean> {
      const expectedEpoch = sessionEpoch
      starting.value = true
      clearError()
      try {
        const response = await getGateway().redistributeStartPreview()
        if (sessionEpoch !== expectedEpoch) return false
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        startPreview.value = response.data
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      } finally {
        starting.value = false
      }
    }

    async function advanceGamePhase(): Promise<boolean> {
      const expectedEpoch = sessionEpoch
      const expectedRevision = lobby.value?.revision
      if (expectedRevision === undefined || !isHost.value) return false

      advancingPhase.value = true
      clearError()
      try {
        const response = await getGateway().advanceGamePhase(expectedRevision)
        if (sessionEpoch !== expectedEpoch) return false
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        applyLobbySnapshot(response.data)
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      } finally {
        advancingPhase.value = false
      }
    }

    async function rewindGamePhase(): Promise<boolean> {
      const expectedEpoch = sessionEpoch
      const expectedRevision = lobby.value?.revision
      if (expectedRevision === undefined || !isHost.value) return false

      advancingPhase.value = true
      clearError()
      try {
        const response = await getGateway().rewindGamePhase(expectedRevision)
        if (sessionEpoch !== expectedEpoch) return false
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        applyLobbySnapshot(response.data)
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      } finally {
        advancingPhase.value = false
      }
    }

    async function recordGameLogEvent(
      eventType: GameLogEventType,
      targetPlayerId: PlayerId,
    ): Promise<boolean> {
      const expectedEpoch = sessionEpoch
      const expectedRevision = lobby.value?.revision
      if (expectedRevision === undefined || !isHost.value) return false

      updatingGameLog.value = true
      clearError()
      try {
        const response = await getGateway().recordGameLogEvent(
          eventType,
          targetPlayerId,
          expectedRevision,
        )
        if (sessionEpoch !== expectedEpoch) return false
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        applyLobbySnapshot(response.data)
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      } finally {
        updatingGameLog.value = false
      }
    }

    async function editGameLogEvent(
      eventId: string,
      targetPlayerId: PlayerId,
    ): Promise<boolean> {
      const expectedEpoch = sessionEpoch
      const expectedRevision = lobby.value?.revision
      if (expectedRevision === undefined || !isHost.value) return false

      updatingGameLog.value = true
      clearError()
      try {
        const response = await getGateway().editGameLogEvent(
          eventId,
          targetPlayerId,
          expectedRevision,
        )
        if (sessionEpoch !== expectedEpoch) return false
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        applyLobbySnapshot(response.data)
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      } finally {
        updatingGameLog.value = false
      }
    }

    async function deleteGameLogEvent(eventId: string): Promise<boolean> {
      const expectedEpoch = sessionEpoch
      const expectedRevision = lobby.value?.revision
      if (expectedRevision === undefined || !isHost.value) return false

      updatingGameLog.value = true
      clearError()
      try {
        const response = await getGateway().deleteGameLogEvent(eventId, expectedRevision)
        if (sessionEpoch !== expectedEpoch) return false
        if (!response.ok) {
          handleAckError(response.error)
          return false
        }
        applyLobbySnapshot(response.data)
        return true
      } catch (caught) {
        setCommandError(caught)
        return false
      } finally {
        updatingGameLog.value = false
      }
    }

    async function sendKeepAlive(): Promise<void> {
      const expectedEpoch = sessionEpoch
      try {
        const response = await getGateway().keepAlive()
        if (sessionEpoch !== expectedEpoch) return
        if (!response.ok) handleAckError(response.error)
      } catch {
        // Socket connection state provides the visible connectivity feedback.
      }
    }

    function startKeepAlive(): void {
      if (
        realtimeSuspended
        || keepAliveTimer !== null
        || !credentials.value
        || !lobby.value
        || connectionState.value !== CONNECTION_STATE.ONLINE
      ) return
      keepAliveTimer = window.setInterval(() => {
        void sendKeepAlive()
      }, CLIENT_TIMING.KEEP_ALIVE_INTERVAL_MS)
    }

    function stopKeepAlive(): void {
      if (keepAliveTimer === null) return
      window.clearInterval(keepAliveTimer)
      keepAliveTimer = null
    }

    function cancelPrivateViewRecovery(): void {
      if (privateRecoveryTimer === null) return
      window.clearTimeout(privateRecoveryTimer)
      privateRecoveryTimer = null
    }

    function schedulePrivateViewRecovery(): void {
      if (realtimeSuspended) return
      if (destination.value !== SESSION_DESTINATION.LOBBY) return
      if (privateRecoveryTimer !== null) return
      const expectedEpoch = sessionEpoch
      privateRecoveryTimer = window.setTimeout(() => {
        privateRecoveryTimer = null
        if (
          !realtimeSuspended
          && sessionEpoch === expectedEpoch
          && lobby.value?.phase === LOBBY_PHASE.STARTED
          && destination.value === SESSION_DESTINATION.LOBBY
        ) {
          void getGateway().reconnect().catch(setCommandError)
        }
      }, CLIENT_TIMING.PRIVATE_VIEW_RECOVERY_DELAY_MS)
    }

    async function retryRestoration(): Promise<void> {
      clearError()
      if (!credentials.value) return
      if (connectionState.value === CONNECTION_STATE.ONLINE) {
        await resumeStoredSession()
        return
      }
      try {
        await getGateway().reconnect()
      } catch (caught) {
        setCommandError(caught)
      }
    }

    async function startNewSession(): Promise<void> {
      const session = credentials.value
      if (!session) return
      restoringSession.value = true
      retiringSession = true
      clearError()
      try {
        let leaveResponse = connectionState.value === CONNECTION_STATE.ONLINE
          ? await getGateway().leave()
          : null

        if (!leaveResponse?.ok) {
          await getGateway().reconnect()
          const resumeResponse = await getGateway().resume(session.sessionToken, session.lobbyId)
          if (resumeResponse.ok) {
            leaveResponse = await getGateway().leave()
            if (!leaveResponse.ok) throw new Error(leaveResponse.error.message)
          } else if (!TERMINAL_SESSION_ERRORS.has(resumeResponse.error.code)) {
            throw new Error(resumeResponse.error.message)
          }
        }

        clearSession()
        connectionState.value = CONNECTION_STATE.ONLINE
      } catch (caught) {
        restoringSession.value = false
        setCommandError(caught)
      } finally {
        retiringSession = false
      }
    }

    function suspendRealtime(): void {
      realtimeSuspended = true
      realtimeEpoch += 1
      stopKeepAlive()
      cancelPrivateViewRecovery()
      resumePromise = null
      restoringSession.value = false
      connectionState.value = CONNECTION_STATE.OFFLINE
      if (unsubscribe) getGateway().disconnect()
    }

    async function resumeRealtime(): Promise<void> {
      realtimeSuspended = false
      realtimeEpoch += 1
      if (!initialized.value) await initialize()
      if (realtimeSuspended) return
      try {
        connectionState.value = CONNECTION_STATE.CONNECTING
        await getGateway().connect()
        if (realtimeSuspended) {
          getGateway().disconnect()
          return
        }
        connectionState.value = CONNECTION_STATE.ONLINE
        await resumeStoredSession()
      } catch (caught) {
        if (!realtimeSuspended) {
          connectionState.value = CONNECTION_STATE.ERROR
          setCommandError(caught)
        }
      }
    }

    function dispose(): void {
      unsubscribe?.()
      unsubscribe = null
      stopKeepAlive()
      cancelPrivateViewRecovery()
      if (noticeTimer !== null) window.clearTimeout(noticeTimer)
      noticeTimer = null
    }

    return {
      connectionState,
      initialized,
      credentials,
      lobby,
      availableLobbies,
      destination,
      privateAssignment,
      hostDashboard,
      startPreview,
      error,
      notice,
      restoringSession,
      entering,
      leaving,
      starting,
      advancingPhase,
      updatingGameLog,
      kickingPlayerId,
      currentPlayer,
      isHost,
      host,
      regularPlayers,
      connectedRegularPlayerCount,
      hasStoredSession,
      hasSession,
      isLobby,
      initialize,
      enter,
      listLobbies,
      createLobby,
      joinLobby,
      leave,
      kick,
      start,
      confirmStart,
      cancelStartPreview,
      redistributeStartPreview,
      advanceGamePhase,
      rewindGamePhase,
      recordGameLogEvent,
      editGameLogEvent,
      deleteGameLogEvent,
      clearError,
      clearSession,
      showCopiedNotice,
      retryRestoration,
      startNewSession,
      suspendRealtime,
      resumeRealtime,
      dispose,
    }
  })
}

export const useLobbyStore = createLobbyStoreDefinition('lobby', {
  getGateway: getLobbyGateway,
  storage: browserSessionStorage,
})
