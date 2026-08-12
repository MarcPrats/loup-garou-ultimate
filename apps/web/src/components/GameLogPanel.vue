<script setup lang="ts">
import { computed, ref } from 'vue'

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
  delete: [eventId: string]
}>()

const selectedTargetId = ref<PlayerId | ''>('')

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
  return entry.eventType === GAME_LOG_EVENT_TYPE.DAY_VOTE
    ? `🗳️ Vote, ${period} ${entry.phase.number}`
    : `${period} ${entry.phase.number}`
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

function editTargetValue(entry: GameLogEntry): PlayerId {
  return entry.targetPlayerId
}

function editSelected(entry: GameLogEntry, event: Event): void {
  const targetId = (event.target as HTMLSelectElement).value as PlayerId
  if (!targetId || targetId === entry.targetPlayerId) return
  emit('edit', entry.id, targetId)
}

function deleteSelected(entry: GameLogEntry): void {
  if (typeof window !== 'undefined' && !window.confirm(
    `Supprimer l’événement concernant ${entry.targetPlayerName} ? Le joueur redeviendra vivant.`,
  )) return
  emit('delete', entry.id)
}

function isVoteEntry(entry: GameLogEntry): boolean {
  return entry.eventType === GAME_LOG_EVENT_TYPE.DAY_VOTE
}
</script>

<template>
  <section
    class="app-game-log-panel mb-6 rounded-3xl border border-slate-700 bg-slate-900/85 p-6 shadow-xl"
    data-testid="game-log-panel"
  >
    <header class="app-game-log-header">
      <div>
        <p class="app-game-log-kicker">📜 Historique public</p>
        <h2 class="app-game-log-title">📜 Historique de la partie</h2>
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
          class="app-game-log-record-btn"
          :disabled="!selectedTargetId || busy"
          :aria-label="currentEventType === GAME_LOG_EVENT_TYPE.NIGHT_KILL ? 'Enregistrer une mort' : 'Enregistrer une exécution'"
          :title="currentEventType === GAME_LOG_EVENT_TYPE.NIGHT_KILL ? 'Enregistrer une mort' : 'Enregistrer une exécution'"
          data-testid="record-game-log-event"
          @click="recordSelected"
        >
          <span aria-hidden="true">{{ busy ? '…' : '+' }}</span>
        </button>
      </div>
    </div>

    <p v-if="ghosts.length" class="app-game-log-ghosts">
      <strong>👻 Fantômes :</strong>
      <span v-for="player in ghosts" :key="player.id">{{ player.name }}</span>
    </p>

    <p v-if="!entries.length" class="app-game-log-empty">
      Aucun événement n’a encore été enregistré.
    </p>
    <ol v-else class="app-game-log-entries" data-testid="game-log-entries">
      <li v-for="entry in entries" :key="entry.id" class="app-game-log-entry" :class="{ 'app-game-log-entry-vote': isVoteEntry(entry) }">
        <span class="app-game-log-entry-phase">{{ phaseLabel(entry) }}</span>
        <span class="app-game-log-entry-text">
          <select
            v-if="canEdit && !isVoteEntry(entry)"
            class="app-game-log-target-select"
            :value="editTargetValue(entry)"
            :aria-label="`Cible de l’événement, ${entry.targetPlayerName}`"
            :data-testid="`edit-game-log-target-${entry.id}`"
            @change="editSelected(entry, $event)"
          >
            <option v-for="player in editOptions(entry)" :key="player.id" :value="player.id">
              {{ player.name }}
            </option>
          </select>
          <strong v-else>{{ entry.targetPlayerName }}</strong>
          <span class="app-game-log-event-description">
            {{ entry.eventType === GAME_LOG_EVENT_TYPE.NIGHT_KILL ? ' 🩸 a été dévoré(e)' : isVoteEntry(entry) ? ' 🗳️ a fait l’objet d’un vote' : ' ⚔️ a été éliminé(e) par le Village' }}
          </span>
          <div v-if="entry.voteDetails" class="app-game-log-vote-details">
            <span><strong>👍 Oui :</strong> {{ entry.voteDetails.yesVoterNames.join(', ') || 'Personne' }}</span>
            <span><strong>👎 Non :</strong> {{ entry.voteDetails.noVoterNames.join(', ') || 'Personne' }}</span>
          </div>
        </span>
        <div v-if="canEdit && !isVoteEntry(entry)" class="app-game-log-edit-controls">
          <button
            type="button"
            class="app-game-log-delete-btn"
            :disabled="busy"
            :aria-label="`Supprimer l’événement concernant ${entry.targetPlayerName}`"
            :title="`Supprimer l’événement concernant ${entry.targetPlayerName}`"
            :data-testid="`delete-game-log-event-${entry.id}`"
            @click="deleteSelected(entry)"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
@media (max-width: 899px) {
  .app-game-log-panel { padding: 18px 14px !important; }
  .app-game-log-header { margin-bottom: 14px; }
  .app-game-log-title { font-size: 1.45rem; line-height: 1.15; }
  .app-game-log-compose { margin-bottom: 14px; padding: 12px; }
  .app-game-log-compose-label { margin-bottom: 8px; font-size: .95rem; line-height: 1.3; }
  .app-game-log-compose-controls { grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
  .app-game-log-compose .app-input { min-width: 0; min-height: 42px; }
  .app-game-log-record-btn { width: 42px; height: 42px; min-width: 42px; min-height: 42px; justify-self: auto; }
  .app-game-log-entry {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px 10px;
    min-height: 0;
    padding: 12px 0;
  }
  .app-game-log-entry-phase { grid-column: 1 / -1; }
  .app-game-log-entry-text {
    display: flex;
    min-width: 0;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    line-height: 1.35;
  }
  .app-game-log-event-description { flex: 1 1 120px; min-width: 0; }
  .app-game-log-vote-details { flex-basis: 100%; display: grid; gap: 4px; color: #d9e5f3; font-size: .9rem; }
  .app-game-log-entry-vote { border-left: 3px solid #fbbf4a; padding-left: 10px; }
  .app-game-log-edit-controls { grid-column: 2; width: auto; }
  .app-game-log-target-select {
    flex: 0 1 190px;
    width: min(100%, 190px);
    max-width: 190px;
    min-width: 0;
  }
}
</style>
