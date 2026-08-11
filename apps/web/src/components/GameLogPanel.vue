<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import {
  GAME_LOG_EVENT_TYPE,
  GAME_PHASE_PERIOD,
  type GameLogEntry,
  type GameLogEventType,
  type GamePhase,
  type PlayerId,
  type PublicPlayer,
} from '@lgu/contracts'

const props = withDefaults(defineProps<{
  entries: readonly GameLogEntry[]
  players: readonly PublicPlayer[]
  phase: GamePhase | null
  canEdit?: boolean
  busy?: boolean
  currentPlayerId?: PlayerId | null
}>(), {
  canEdit: false,
  busy: false,
  currentPlayerId: null,
})

const emit = defineEmits<{
  record: [eventType: GameLogEventType, targetPlayerId: PlayerId]
  edit: [eventId: string, targetPlayerId: PlayerId]
}>()

const selectedTargetId = ref<PlayerId | ''>('')
const editTargets = reactive<Record<string, PlayerId | ''>>({})

const currentEventType = computed<GameLogEventType | null>(() => {
  if (!props.phase) return null
  return props.phase.period === GAME_PHASE_PERIOD.NIGHT
    ? GAME_LOG_EVENT_TYPE.NIGHT_KILL
    : GAME_LOG_EVENT_TYPE.DAY_EXECUTION
})

const aliveTargets = computed(() => props.players.filter(
  (player) => !player.isHost && player.alive,
))

const ghosts = computed(() => props.players.filter(
  (player) => !player.isHost && !player.alive,
))

const currentPlayer = computed(() => props.players.find(
  (player) => player.id === props.currentPlayerId,
))

function phaseLabel(entry: GameLogEntry): string {
  const period = entry.phase.period === GAME_PHASE_PERIOD.NIGHT ? 'Nuit' : 'Jour'
  return `${period} ${entry.phase.number}`
}

function editOptions(entry: GameLogEntry): PublicPlayer[] {
  return props.players.filter(
    (player) => !player.isHost && (player.alive || player.id === entry.targetPlayerId),
  )
}

function recordSelected(): void {
  if (!currentEventType.value || !selectedTargetId.value) return
  emit('record', currentEventType.value, selectedTargetId.value)
  selectedTargetId.value = ''
}

function editSelected(entry: GameLogEntry): void {
  const targetId = editTargets[entry.id]
  if (!targetId || targetId === entry.targetPlayerId) return
  emit('edit', entry.id, targetId)
}
</script>

<template>
  <section
    class="app-game-log-panel mb-6 rounded-3xl border border-slate-700 bg-slate-900/85 p-6 shadow-xl"
    data-testid="game-log-panel"
  >
    <header class="app-game-log-header">
      <div>
        <p class="app-game-log-kicker">Historique public</p>
        <h2 class="app-game-log-title">Morts et exécutions</h2>
      </div>
      <p class="app-game-log-count">
        {{ entries.length }} événement{{ entries.length > 1 ? 's' : '' }} enregistré{{ entries.length > 1 ? 's' : '' }}
      </p>
    </header>

    <div
      v-if="canEdit && currentEventType"
      class="app-game-log-compose"
    >
      <p class="app-game-log-compose-label">
        {{ currentEventType === GAME_LOG_EVENT_TYPE.NIGHT_KILL ? 'Enregistrer une mort cette nuit' : 'Enregistrer une exécution aujourd’hui' }}
      </p>
      <div class="app-game-log-compose-controls">
        <select
          v-model="selectedTargetId"
          class="app-input min-w-0 flex-1"
          data-testid="game-log-target"
        >
          <option value="">Choisir un joueur vivant</option>
          <option v-for="player in aliveTargets" :key="player.id" :value="player.id">
            {{ player.name }}
          </option>
        </select>
        <button
          type="button"
          class="app-btn app-btn-primary app-game-log-record-btn"
          :disabled="!selectedTargetId || busy"
          data-testid="record-game-log-event"
          @click="recordSelected"
        >
          {{ busy ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </div>

    <p v-if="currentPlayer && !currentPlayer.alive" class="app-game-log-ghost-notice">
      Vous êtes un fantôme. Vous pouvez continuer à consulter l’historique public.
    </p>

    <p v-if="ghosts.length" class="app-game-log-ghosts">
      <strong>Fantômes :</strong>
      <span v-for="player in ghosts" :key="player.id">{{ player.name }}</span>
    </p>

    <p v-if="!entries.length" class="app-game-log-empty">
      Aucun événement n’a encore été enregistré.
    </p>
    <ol v-else class="app-game-log-entries" data-testid="game-log-entries">
      <li v-for="entry in entries" :key="entry.id" class="app-game-log-entry">
        <span class="app-game-log-entry-phase">{{ phaseLabel(entry) }}</span>
        <span class="app-game-log-entry-text">
          <strong>{{ entry.targetPlayerName }}</strong>
          {{ entry.eventType === GAME_LOG_EVENT_TYPE.NIGHT_KILL ? 'est mort(e)' : 'a été exécuté(e)' }}
        </span>
        <div v-if="canEdit" class="app-game-log-edit-controls">
          <select
            v-model="editTargets[entry.id]"
            class="app-input app-game-log-edit-select"
            :aria-label="`Nouvelle cible pour ${entry.targetPlayerName}`"
            :data-testid="`edit-game-log-target-${entry.id}`"
          >
            <option value="">Corriger la cible</option>
            <option v-for="player in editOptions(entry)" :key="player.id" :value="player.id">
              {{ player.name }}
            </option>
          </select>
          <button
            type="button"
            class="app-game-log-edit-btn"
            :disabled="!editTargets[entry.id] || editTargets[entry.id] === entry.targetPlayerId || busy"
            :aria-label="`Corriger l’événement concernant ${entry.targetPlayerName}`"
            :title="`Corriger l’événement concernant ${entry.targetPlayerName}`"
            :data-testid="`edit-game-log-event-${entry.id}`"
            @click="editSelected(entry)"
          >
            <span aria-hidden="true">✎</span>
          </button>
        </div>
      </li>
    </ol>
  </section>
</template>
