<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import {
  GAME_LOG_EVENT_TYPE,
  GAME_PHASE_PERIOD,
  PLAYER_COUNT_LIMIT,
  getNextGamePhase,
  type GameLogEventType,
  type PlayerId,
  type SimulatorScenario,
} from '@lgu/contracts'

import FeedbackBanner from '../../components/FeedbackBanner.vue'
import GameLogPanel from '../../components/GameLogPanel.vue'
import GamePhasePanel from '../../components/GamePhasePanel.vue'
import HostDashboardPanel from '../../components/HostDashboardPanel.vue'
import PlayerAssignmentPanel from '../../components/PlayerAssignmentPanel.vue'
import { AppButton, AppCard, AppSelect } from '../../components/ui'
import { ROUTE_NAME, ROUTE_PATH } from '../../constants/app'
import { appPath } from '../../constants/paths'
import {
  createDefaultPlayerNames,
  createRandomSimulatorSeed,
  createSimulatorScenario,
} from './simulator-engine'

const SIMULATOR_VIEW = {
  HOST: 'host',
} as const

const playerCount = ref<number>(PLAYER_COUNT_LIMIT.MINIMUM)
const scenario = ref<SimulatorScenario | null>(null)
const activeView = ref<string>(SIMULATOR_VIEW.HOST)
const errorMessage = ref<string | null>(null)

const selectedPlayerCount = computed<string>({
  get: () => String(playerCount.value),
  set: (value) => {
    playerCount.value = Number(value)
  },
})

const playerCountOptions = Array.from(
  {
    length:
      PLAYER_COUNT_LIMIT.MAXIMUM - PLAYER_COUNT_LIMIT.MINIMUM + 1,
  },
  (_, index) => PLAYER_COUNT_LIMIT.MINIMUM + index,
)
const activePlayerAssignment = computed(() => (
  scenario.value?.privateAssignments.find(
    (assignment) => assignment.player.id === activeView.value,
  ) ?? null
))
const activePlayer = computed(() => (
  scenario.value?.lobby.players.find(
    (player) => player.id === activeView.value,
  ) ?? null
))
const activePlayerDashboard = computed(() => (
  scenario.value?.loupBlancDashboards.find(
    (entry) => entry.playerId === activeView.value,
  )?.dashboard ?? null
))
const playerOptions = computed(() => (
  scenario.value?.lobby.players.filter((player) => !player.isHost) ?? []
))
const selectedPlayerId = computed<string>({
  get: () => activeView.value === SIMULATOR_VIEW.HOST ? '' : activeView.value,
  set: (playerId) => {
    activeView.value = playerId || SIMULATOR_VIEW.HOST
  },
})

function simulatorEventType(): GameLogEventType | null {
  const phase = scenario.value?.lobby.gamePhase
  if (!phase) return null
  return phase.period === GAME_PHASE_PERIOD.NIGHT
    ? GAME_LOG_EVENT_TYPE.NIGHT_KILL
    : GAME_LOG_EVENT_TYPE.DAY_EXECUTION
}

function simulatorAlivePlayers(log = scenario.value?.lobby.gameLog ?? []): Set<PlayerId> {
  return new Set(log.map((entry) => entry.targetPlayerId))
}

function updateSimulatorPlayers(
  lobby: SimulatorScenario['lobby'],
  log: SimulatorScenario['lobby']['gameLog'],
): SimulatorScenario['lobby']['players'] {
  const deadPlayerIds = simulatorAlivePlayers(log)
  return lobby.players.map((player) => ({
    ...player,
    alive: player.isHost || !deadPlayerIds.has(player.id),
  }))
}

function recordSimulatorGameLogEvent(
  eventType: GameLogEventType,
  targetPlayerId: PlayerId,
): void {
  if (!scenario.value || activeView.value !== SIMULATOR_VIEW.HOST) return
  const phase = scenario.value.lobby.gamePhase
  const target = scenario.value.lobby.players.find((player) => player.id === targetPlayerId)
  if (!phase || !target || target.isHost || !target.alive) return
  if (eventType !== simulatorEventType()) return

  const entry = {
    id: `sim-event-${scenario.value.lobby.revision + 1}`,
    eventType,
    phase,
    targetPlayerId,
    targetPlayerName: target.name,
  }
  const gameLog = [...scenario.value.lobby.gameLog, entry]
  scenario.value = {
    ...scenario.value,
    lobby: {
      ...scenario.value.lobby,
      gameLog,
      players: updateSimulatorPlayers(scenario.value.lobby, gameLog),
      revision: scenario.value.lobby.revision + 1,
    },
  }
}

function editSimulatorGameLogEvent(eventId: string, targetPlayerId: PlayerId): void {
  if (!scenario.value || activeView.value !== SIMULATOR_VIEW.HOST) return
  const currentEntry = scenario.value.lobby.gameLog.find((entry) => entry.id === eventId)
  const target = scenario.value.lobby.players.find((player) => player.id === targetPlayerId)
  if (!currentEntry || !target || target.isHost || (!target.alive && target.id !== currentEntry.targetPlayerId)) return

  const gameLog = scenario.value.lobby.gameLog.map((entry) => (
    entry.id === eventId
      ? { ...entry, targetPlayerId, targetPlayerName: target.name }
      : entry
  ))
  scenario.value = {
    ...scenario.value,
    lobby: {
      ...scenario.value.lobby,
      gameLog,
      players: updateSimulatorPlayers(scenario.value.lobby, gameLog),
      revision: scenario.value.lobby.revision + 1,
    },
  }
}

function deleteSimulatorGameLogEvent(eventId: string): void {
  if (!scenario.value || activeView.value !== SIMULATOR_VIEW.HOST) return

  const gameLog = scenario.value.lobby.gameLog.filter((entry) => entry.id !== eventId)
  if (gameLog.length === scenario.value.lobby.gameLog.length) return
  scenario.value = {
    ...scenario.value,
    lobby: {
      ...scenario.value.lobby,
      gameLog,
      players: updateSimulatorPlayers(scenario.value.lobby, gameLog),
      revision: scenario.value.lobby.revision + 1,
    },
  }
}

function rewindSimulatorPhase(): void {
  if (!scenario.value || activeView.value !== SIMULATOR_VIEW.HOST) return
  const phase = scenario.value.lobby.gamePhase
  if (!phase || (phase.period === GAME_PHASE_PERIOD.NIGHT && phase.number === 1)) return
  const previous = phase.period === GAME_PHASE_PERIOD.DAY
    ? { period: GAME_PHASE_PERIOD.NIGHT, number: phase.number }
    : { period: GAME_PHASE_PERIOD.DAY, number: phase.number - 1 }
  scenario.value = {
    ...scenario.value,
    lobby: {
      ...scenario.value.lobby,
      gamePhase: previous,
      revision: scenario.value.lobby.revision + 1,
    },
  }
}

function advanceSimulatorPhase(): void {
  if (!scenario.value || activeView.value !== SIMULATOR_VIEW.HOST) return
  const phase = scenario.value.lobby.gamePhase
  if (!phase) return
  scenario.value = {
    ...scenario.value,
    lobby: {
      ...scenario.value.lobby,
      gamePhase: getNextGamePhase(phase),
      revision: scenario.value.lobby.revision + 1,
    },
  }
}

function generate(): void {
  errorMessage.value = null
  try {
    scenario.value = createSimulatorScenario({
      playerNames: createDefaultPlayerNames(playerCount.value),
      seed: createRandomSimulatorSeed(),
    })
    activeView.value = SIMULATOR_VIEW.HOST
  } catch (error) {
    scenario.value = null
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Impossible de générer ce scénario.'
  }
}

generate()
</script>

<template>
  <main class="app-page text-white">
    <div class="mx-auto w-full max-w-7xl">
      <header class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-sm font-black uppercase tracking-[0.24em] text-lgu-orange">
            Outil de simulation
          </p>
          <h1 class="mt-2 font-display text-4xl font-bold sm:text-6xl">
            Simulateur
          </h1>
          <p class="mt-4 max-w-3xl leading-7 text-slate-300">
            Générez une partie avec le même moteur, les mêmes projections et les mêmes composants que la partie réelle.
          </p>
        </div>
        <RouterLink
          :to="{ name: ROUTE_NAME.HOME }"
          class="w-fit rounded-xl border border-white/15 px-5 py-3 font-bold text-slate-200 hover:bg-white/10"
        >
          Retour au jeu
        </RouterLink>
      </header>

      <AppCard as="section" elevated class="mt-8 rounded-3xl p-6 sm:p-8">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div class="sm:w-64">
              <label for="simulator-player-count" class="text-sm font-bold text-slate-300">
                Nombre de joueurs
              </label>
              <AppSelect
                id="simulator-player-count"
                v-model="selectedPlayerCount"
                class="mt-2"
              >
                <option v-for="count in playerCountOptions" :key="count" :value="count">
                  {{ count }} joueurs
                </option>
              </AppSelect>
            </div>

            <AppButton variant="primary" size="lg" @click="generate">
              Générer
            </AppButton>
          </div>

          <div v-if="scenario" class="flex flex-col gap-2 lg:items-end">
            <span class="text-sm font-bold text-slate-300">Vue à afficher</span>
            <div class="flex flex-col gap-2 sm:flex-row">
              <AppButton
                size="sm"
                :variant="activeView === SIMULATOR_VIEW.HOST ? 'primary' : 'secondary'"
                @click="activeView = SIMULATOR_VIEW.HOST"
              >
                Vue MJ
              </AppButton>
              <AppSelect
                aria-label="Choisir une vue joueur"
                v-model="selectedPlayerId"
                class="app-simulator-player-select"
              >
                <option value="">Vue d’un joueur…</option>
                <option
                  v-for="player in playerOptions"
                  :key="player.id"
                  :value="player.id"
                >
                  {{ player.name }}
                </option>
              </AppSelect>
            </div>
          </div>
        </div>
      </AppCard>

      <FeedbackBanner
        v-if="errorMessage"
        class="mt-6"
        :message="errorMessage"
        variant="error"
      />

      <template v-if="scenario">
        <div
          v-if="activeView === SIMULATOR_VIEW.HOST"
          :key="activeView"
          class="mt-8"
        >
          <GamePhasePanel
            :phase="scenario.lobby.gamePhase"
            can-advance
            :can-rewind="scenario.lobby.gamePhase?.period === 'day' || (scenario.lobby.gamePhase?.number ?? 1) > 1"
            @advance="advanceSimulatorPhase"
            @rewind="rewindSimulatorPhase"
          />
          <GameLogPanel
            :entries="scenario.lobby.gameLog"
            :players="scenario.lobby.players"
            :phase="scenario.lobby.gamePhase"
            :can-edit="activeView === SIMULATOR_VIEW.HOST"
            :can-record="activeView === SIMULATOR_VIEW.HOST"
            @record="recordSimulatorGameLogEvent"
            @edit="editSimulatorGameLogEvent"
            @delete="deleteSimulatorGameLogEvent"
          />
          <HostDashboardPanel
            :dashboard="scenario.hostDashboard"
          />
        </div>

        <div
          v-else-if="activePlayerAssignment"
          :key="activeView"
          class="app-screen app-game-container mx-auto mt-8 w-full"
        >
          <section
            v-if="activePlayer && !activePlayer.alive"
            class="app-ghost-status-panel"
            role="status"
          >
            <p class="app-ghost-status-kicker">👻 Vous êtes un fantôme</p>
            <p class="app-ghost-status-message">
              💬 Vous avez toujours le droit de parler et vous disposez encore d’un dernier vote pour le reste de la partie.
            </p>
          </section>

          <PlayerAssignmentPanel
            :assignment="activePlayerAssignment"
            :dashboard="activePlayerDashboard"
            :show-rules-link="false"
          />

          <GamePhasePanel
            :phase="scenario.lobby.gamePhase"
          />

          <GameLogPanel
            :entries="scenario.lobby.gameLog"
            :players="scenario.lobby.players"
            :phase="scenario.lobby.gamePhase"
            :current-player-id="activePlayer?.id ?? null"
          />

          <a
            :href="appPath(ROUTE_PATH.RULES)"
            class="app-btn app-btn-secondary app-rules-button"
            target="_blank"
            rel="noopener noreferrer"
          >
            📖 Consulter les règles
          </a>
        </div>
        <div v-else :key="activeView" class="mt-8">
          <FeedbackBanner
            message="La vue joueur sélectionnée est indisponible."
            variant="error"
          />
        </div>
      </template>
    </div>
  </main>
</template>
