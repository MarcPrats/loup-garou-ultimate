<script setup lang="ts">
import { computed } from 'vue'

import {
  GAME_PHASE_PERIOD,
  type GamePhase,
} from '@lgu/contracts'

const props = withDefaults(defineProps<{
  phase: GamePhase | null
  canAdvance?: boolean
  advancing?: boolean
}>(), {
  canAdvance: false,
  advancing: false,
})

const emit = defineEmits<{
  advance: []
}>()

const phaseLabel = computed(() => {
  if (!props.phase) return 'La partie n’a pas commencé'
  const period = props.phase.period === GAME_PHASE_PERIOD.NIGHT ? '🌙 Nuit' : '☀️ Jour'
  return `${period} ${props.phase.number}`
})

const phaseDescription = computed(() => {
  if (!props.phase) return 'La phase de jeu sera affichée ici au démarrage.'
  return props.phase.period === GAME_PHASE_PERIOD.NIGHT
    ? '🌙 Les actions de nuit peuvent être effectuées.'
    : '☀️ La journée et les discussions sont ouvertes.'
})
</script>

<template>
  <section
    class="app-game-phase-panel mb-6 rounded-3xl border border-lgu-orange/40 bg-slate-900/90 p-6 shadow-xl"
    aria-live="polite"
    data-testid="game-phase-panel"
  >
    <div class="app-game-phase-panel-content flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div class="app-game-phase-panel-copy min-w-0">
        <p class="text-xs font-black uppercase tracking-[0.24em] text-lgu-orange">
          🎭 État de la partie
        </p>
        <h2 class="mt-2 font-display text-3xl font-black text-white">
          {{ phaseLabel }}
        </h2>
        <p class="mt-2 text-sm text-slate-300">
          {{ phaseDescription }}
        </p>
      </div>

      <button
        v-if="canAdvance"
        type="button"
        class="app-btn app-btn-primary app-game-phase-advance-btn shrink-0"
        :disabled="advancing"
        data-testid="advance-game-phase"
        @click="emit('advance')"
      >
        {{ advancing ? 'Passage en cours…' : 'Passer à la phase suivante' }}
      </button>
    </div>
  </section>
</template>
