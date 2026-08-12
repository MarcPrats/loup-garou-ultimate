<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  DAY_VOTE_CHOICE,
  DAY_VOTE_STATUS,
  type DayVoteChoice,
  type DayVoteSnapshot,
  type PlayerId,
  type PublicPlayer,
} from '@lgu/contracts'

const props = withDefaults(defineProps<{
  dayVote: DayVoteSnapshot | null
  players: readonly PublicPlayer[]
  currentPlayerId?: PlayerId | null
  isHost?: boolean
}>(), { currentPlayerId: null, isHost: false })

const emit = defineEmits<{
  propose: [targetPlayerId: PlayerId]
  approve: []
  reject: []
  vote: [choice: DayVoteChoice]
}>()

const selectedTargetId = ref<PlayerId | ''>('')
const now = ref(Date.now())
let timer: number | null = null

const currentPlayer = computed(() => props.players.find((player) => player.id === props.currentPlayerId))
const livingPlayers = computed(() => props.players.filter((player) => !player.isHost && player.alive))
const currentBallot = computed(() => props.dayVote?.ballots.find((ballot) => ballot.voterId === props.currentPlayerId) ?? null)
const canNominate = computed(() => Boolean(
  !props.isHost && currentPlayer.value?.alive && props.dayVote
  && (props.dayVote.status === DAY_VOTE_STATUS.IDLE || props.dayVote.status === DAY_VOTE_STATUS.RESOLVED),
))
const canVote = computed(() => Boolean(
  !props.isHost && props.dayVote?.status === DAY_VOTE_STATUS.ACTIVE
  && props.dayVote.eligibleVoterIds.includes(props.currentPlayerId ?? ('' as PlayerId))
  && !currentBallot.value,
))
const remainingSeconds = computed(() => {
  if (!props.dayVote?.closesAt || props.dayVote.status !== DAY_VOTE_STATUS.ACTIVE) return 0
  return Math.max(0, Math.ceil((props.dayVote.closesAt - now.value) / 1_000))
})

onMounted(() => { timer = window.setInterval(() => { now.value = Date.now() }, 250) })
onBeforeUnmount(() => { if (timer !== null) window.clearInterval(timer) })
</script>

<template>
  <section v-if="dayVote" class="app-day-voting-panel" aria-live="polite">
    <header class="app-day-voting-header">
      <p class="app-kicker">🗳️ Vote du Village</p>
      <h3>Jour {{ dayVote.day }}</h3>
      <p v-if="dayVote.status === DAY_VOTE_STATUS.IDLE || dayVote.status === DAY_VOTE_STATUS.RESOLVED">
        Chaque joueur vivant peut proposer une cible encore disponible.
      </p>
    </header>

    <div v-if="canNominate" class="app-day-voting-nomination-form">
      <label for="day-vote-target">Nominer un joueur</label>
      <div class="app-day-voting-form-row">
        <select id="day-vote-target" v-model="selectedTargetId" class="app-input">
          <option value="">Choisir une cible vivante</option>
          <option v-for="player in livingPlayers.filter((candidate) => candidate.id !== currentPlayerId)" :key="player.id" :value="player.id">
            {{ player.name }}
          </option>
        </select>
        <button type="button" class="app-btn app-btn-primary" :disabled="!selectedTargetId" @click="selectedTargetId && emit('propose', selectedTargetId)">
          Proposer
        </button>
      </div>
    </div>

    <div v-if="dayVote.nomination" class="app-day-voting-nomination">
      <p><strong>{{ dayVote.nomination.nominatorName }}</strong> propose l’élimination de <strong>{{ dayVote.nomination.targetName }}</strong>.</p>
      <div v-if="isHost && dayVote.status === DAY_VOTE_STATUS.NOMINATION_PENDING" class="app-day-voting-actions">
        <button type="button" class="app-btn app-btn-secondary" @click="emit('reject')">❌ Refuser</button>
        <button type="button" class="app-btn app-btn-primary" @click="emit('approve')">✅ Lancer le vote</button>
      </div>
    </div>

    <div v-if="dayVote.status === DAY_VOTE_STATUS.ACTIVE" class="app-day-voting-active">
      <p class="app-day-voting-countdown">⏱️ Vote ouvert, {{ remainingSeconds }} s restantes</p>
      <div class="app-day-voting-tally">
        <span>👍 Oui : <strong>{{ dayVote.yesCount }}</strong></span>
        <span>👎 Non : <strong>{{ dayVote.noCount }}</strong></span>
        <span>Majorité requise : <strong>{{ dayVote.threshold }}</strong></span>
      </div>
      <div class="app-day-voting-ballots">
        <span v-for="ballot in dayVote.ballots" :key="ballot.voterId" class="app-day-voting-ballot">
          {{ ballot.voterName }} {{ ballot.choice === DAY_VOTE_CHOICE.YES ? '👍' : '👎' }}
        </span>
      </div>
      <div v-if="canVote" class="app-day-voting-actions">
        <button type="button" class="app-btn app-btn-secondary" @click="emit('vote', DAY_VOTE_CHOICE.NO)">👎 Non</button>
        <button type="button" class="app-btn app-btn-primary" @click="emit('vote', DAY_VOTE_CHOICE.YES)">👍 Oui</button>
      </div>
      <p v-else-if="currentBallot">Votre vote est enregistré.</p>
    </div>

    <div v-if="dayVote.status === DAY_VOTE_STATUS.RESOLVED && dayVote.result" class="app-day-voting-result">
      <strong>{{ dayVote.result.passed ? '✅ Majorité atteinte' : '❌ Majorité non atteinte' }}</strong>
      <span>{{ dayVote.result.yesCount }} Oui, {{ dayVote.result.noCount }} Non, majorité requise : {{ dayVote.result.threshold }}.</span>
      <span v-if="!isHost">Le résultat est enregistré. Le MJ gère la suite de la journée.</span>
    </div>
  </section>
</template>

<style scoped>
.app-day-voting-panel { display: grid; gap: 16px; padding: 20px; border: 1px solid rgba(75, 144, 214, .55); border-radius: 20px; background: rgba(18, 40, 66, .78); }
.app-day-voting-header, .app-day-voting-nomination, .app-day-voting-active, .app-day-voting-result { display: grid; gap: 8px; }
.app-day-voting-header p, .app-day-voting-header h3, .app-day-voting-nomination p, .app-day-voting-result span, .app-day-voting-result strong { margin: 0; }
.app-day-voting-header .app-kicker { color: #fbbf4a; font-size: .8rem; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }
.app-day-voting-form-row, .app-day-voting-actions, .app-day-voting-tally, .app-day-voting-ballots { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.app-day-voting-form-row .app-input { min-width: 0; flex: 1 1 220px; }
.app-day-voting-countdown { color: #fbbf4a; font-weight: 800; }
.app-day-voting-ballot { padding: 6px 10px; border-radius: 999px; background: rgba(255, 255, 255, .1); }
.app-day-voting-result { padding: 12px 14px; border-radius: 14px; background: rgba(255, 255, 255, .08); }
@media (max-width: 899px) { .app-day-voting-panel { padding: 16px 12px; } .app-day-voting-form-row, .app-day-voting-actions { display: grid; grid-template-columns: 1fr; } .app-day-voting-form-row .app-btn, .app-day-voting-actions .app-btn { width: 100%; } }
</style>
