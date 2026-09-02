<script setup lang="ts">
import { computed } from 'vue'

import {
  GAME_PHASE_PERIOD,
  type GamePhase,
} from '@lgu/contracts'

interface Props {
  phase: GamePhase | null
  gameEnded?: boolean
  canAdvance?: boolean
  canRewind?: boolean
  advancing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  gameEnded: false,
  canAdvance: false,
  canRewind: false,
  advancing: false,
})

const emit = defineEmits<{
  advance: []
  rewind: []
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
    :class="phase?.period === GAME_PHASE_PERIOD.NIGHT ? 'app-game-phase-panel-night' : 'app-game-phase-panel-day'"
    aria-live="polite"
    data-testid="game-phase-panel"
  >
    <div class="app-game-phase-panel-content flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div class="app-game-phase-panel-copy min-w-0">
        <p class="text-xs font-black uppercase tracking-[0.24em] text-lgu-orange">
          🎭 État de la partie
        </p>
        <h2 class="mt-2 font-display text-3xl font-black text-white">
          {{ props.gameEnded ? '🏁 Partie terminée' : phaseLabel }}
        </h2>
        <p class="mt-2 text-sm text-slate-300">
          {{ props.gameEnded ? 'La partie est terminée : il reste deux joueurs ou moins en vie.' : phaseDescription }}
        </p>
      </div>

      <div v-if="canAdvance" class="app-game-phase-actions">
        <button
          v-if="canRewind"
          type="button"
          class="app-game-phase-rewind-btn"
          :disabled="advancing"
          data-testid="rewind-game-phase"
          @click="emit('rewind')"
        >
          ← <span>Phase précédente</span>
        </button>
        <button
          type="button"
          class="app-btn app-btn-primary app-game-phase-advance-btn shrink-0"
          :disabled="advancing"
          data-testid="advance-game-phase"
          @click="emit('advance')"
        >
          {{ advancing ? 'Passage en cours…' : 'Passer à la phase suivante' }}
        </button>
      </div>
    </div>
  </section>
</template>
