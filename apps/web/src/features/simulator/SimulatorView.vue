<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import SimulatorPublicPreview from './SimulatorPublicPreview.vue'
import {
  createDefaultPlayerNames,
  createRandomSimulatorSeed,
  createSimulatorScenario,
} from './simulator-engine'

const SIMULATOR_VIEW = {
  PUBLIC: 'public',
  HOST: 'host',
} as const

const playerCount = ref(PLAYER_COUNT_LIMIT.MINIMUM)
const playerNames = ref(createDefaultPlayerNames(playerCount.value))
const seed = ref('scenario-demo')
const scenario = ref<SimulatorScenario | null>(null)
const activeView = ref<string>(SIMULATOR_VIEW.PUBLIC)
const errorMessage = ref<string | null>(null)
const copyMessage = ref<string | null>(null)

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

watch(playerCount, (nextCount) => {
  const previous = playerNames.value
  playerNames.value = Array.from({ length: nextCount }, (_, index) => (
    previous[index] ?? `Joueur ${index + 1}`
  ))
})

function generate(): void {
  errorMessage.value = null
  copyMessage.value = null
  try {
    scenario.value = createSimulatorScenario({
      playerNames: playerNames.value,
      seed: seed.value,
    })
    activeView.value = SIMULATOR_VIEW.PUBLIC
  } catch (error) {
    scenario.value = null
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Impossible de générer ce scénario.'
  }
}

function randomizeSeed(): void {
  seed.value = createRandomSimulatorSeed()
  generate()
}

async function copyScenario(): Promise<void> {
  if (!scenario.value) return
  copyMessage.value = null
  try {
    await navigator.clipboard.writeText(JSON.stringify(scenario.value, null, 2))
    copyMessage.value = 'Scénario privé copié au format JSON.'
  } catch {
    copyMessage.value = 'Copie impossible dans ce navigateur.'
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
            Générez des attributions reproductibles avec le même moteur, les mêmes projections et les mêmes composants que la partie réelle.
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
        message="Le simulateur est isolé : aucun socket, aucune session, aucun appel API et aucune donnée persistée. Les liens privés affichés dans le JSON sont synthétiques."
        variant="warning"
      />

      <section class="mt-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl sm:p-8">
        <div class="grid gap-5 lg:grid-cols-[12rem_1fr_auto] lg:items-end">
          <div>
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

          <div>
            <label for="simulator-seed" class="text-sm font-bold text-slate-300">
              Seed reproductible
            </label>
            <div class="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="simulator-seed"
                v-model="seed"
                maxlength="120"
                class="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-mono text-white"
              >
              <button
                type="button"
                class="rounded-xl bg-white/10 px-4 py-3 font-bold hover:bg-white/15"
                @click="randomizeSeed"
              >
                Nouveau seed
              </button>
            </div>
          </div>

          <button
            type="button"
            class="rounded-xl bg-gradient-to-r from-lgu-orange to-lgu-blue px-6 py-3 font-black text-white hover:brightness-110"
            @click="generate"
          >
            Générer
          </button>
        </div>

        <details class="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
          <summary class="cursor-pointer font-bold text-white">
            Modifier les noms des joueurs
          </summary>
          <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="(_, index) in playerNames" :key="index">
              <label :for="`simulator-player-${index}`" class="text-xs font-bold text-slate-400">
                Joueur {{ index + 1 }}
              </label>
              <input
                :id="`simulator-player-${index}`"
                v-model="playerNames[index]"
                maxlength="40"
                class="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
              >
            </div>
          </div>
        </details>
      </section>

      <FeedbackBanner
        v-if="errorMessage"
        class="mt-6"
        :message="errorMessage"
        variant="error"
      />

      <template v-if="scenario">
        <section class="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-sm text-slate-400">Scénario actif</p>
              <p class="mt-1 break-all font-mono font-bold text-white">{{ scenario.seed }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-xl px-4 py-2 font-bold"
                :class="activeView === SIMULATOR_VIEW.PUBLIC ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-200'"
                @click="activeView = SIMULATOR_VIEW.PUBLIC"
              >
                Vue publique
              </button>
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
          </div>

          <div class="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              class="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
              @click="copyScenario"
            >
              Copier le JSON privé
            </button>
            <p v-if="copyMessage" role="status" class="text-sm text-slate-300">
              {{ copyMessage }}
            </p>
          </div>
        </section>

        <div class="mt-8">
          <SimulatorPublicPreview
            v-if="activeView === SIMULATOR_VIEW.PUBLIC"
            :room="scenario.room"
          />
          <HostDashboardPanel
            v-else-if="activeView === SIMULATOR_VIEW.HOST"
            :dashboard="scenario.hostDashboard"
            :show-access-link="false"
          />
          <PlayerAssignmentPanel
            v-else-if="activePlayerAssignment"
            :assignment="activePlayerAssignment"
            :show-access-link="false"
          />
        </div>
      </template>
    </div>
  </main>
</template>
