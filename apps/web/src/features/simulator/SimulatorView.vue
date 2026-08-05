<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import {
  PLAYER_COUNT_LIMIT,
  type PlayerId,
  type SimulatorScenario,
} from '@lgu/contracts'

import FeedbackBanner from '../../components/FeedbackBanner.vue'
import HostDashboardPanel from '../../components/HostDashboardPanel.vue'
import PlayerAssignmentPanel from '../../components/PlayerAssignmentPanel.vue'
import { ROUTE_NAME } from '../../constants/app'
import {
  createDefaultPlayerNames,
  createRandomSimulatorSeed,
  createSimulatorScenario,
} from './simulator-engine'

const SIMULATOR_VIEW = {
  HOST: 'host',
} as const

const playerCount = ref(PLAYER_COUNT_LIMIT.MINIMUM)
const scenario = ref<SimulatorScenario | null>(null)
const activeView = ref<string>(SIMULATOR_VIEW.HOST)
const errorMessage = ref<string | null>(null)

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

function selectPlayer(playerId: PlayerId): void {
  activeView.value = playerId
}

generate()
</script>

<template>
  <main class="min-h-screen px-4 py-8 text-white sm:py-12">
    <div class="mx-auto w-full max-w-7xl">
      <header class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-sm font-black uppercase tracking-[0.24em] text-lgu-orange">
            Outil de développement local
          </p>
          <h1 class="mt-2 font-display text-4xl font-bold sm:text-6xl">
            Simulateur V3
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

      <FeedbackBanner
        class="mt-6"
        message="Le simulateur est isolé : aucun socket, aucune session, aucun appel API et aucune donnée persistée."
        variant="warning"
      />

      <section class="mt-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl sm:p-8">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div class="flex-1 sm:max-w-xs">
            <label for="simulator-player-count" class="text-sm font-bold text-slate-300">
              Nombre de joueurs
            </label>
            <select
              id="simulator-player-count"
              v-model.number="playerCount"
              class="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
            >
              <option v-for="count in playerCountOptions" :key="count" :value="count">
                {{ count }} joueurs
              </option>
            </select>
          </div>

          <button
            type="button"
            class="rounded-xl bg-gradient-to-r from-lgu-orange to-lgu-blue px-6 py-3 font-black text-white hover:brightness-110"
            @click="generate"
          >
            Générer
          </button>
        </div>
      </section>

      <FeedbackBanner
        v-if="errorMessage"
        class="mt-6"
        :message="errorMessage"
        variant="error"
      />

      <template v-if="scenario">
        <section class="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <div class="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-xl px-4 py-2 font-bold"
              :class="activeView === SIMULATOR_VIEW.HOST ? 'bg-lgu-orange text-white' : 'bg-white/10 text-slate-200'"
              @click="activeView = SIMULATOR_VIEW.HOST"
            >
              Vue MJ
            </button>
            <select
              aria-label="Choisir une vue joueur"
              class="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 font-bold text-white"
              :value="activePlayerAssignment?.player.id ?? ''"
              @change="selectPlayer(($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>Vue d’un joueur…</option>
              <option
                v-for="assignment in scenario.privateAssignments"
                :key="assignment.player.id"
                :value="assignment.player.id"
              >
                {{ assignment.player.name }}
              </option>
            </select>
          </div>
        </section>

        <div class="mt-8">
          <HostDashboardPanel
            v-if="activeView === SIMULATOR_VIEW.HOST"
            :dashboard="scenario.hostDashboard"
          />
          <PlayerAssignmentPanel
            v-else-if="activePlayerAssignment"
            :assignment="activePlayerAssignment"
          />
        </div>
      </template>
    </div>
  </main>
</template>
