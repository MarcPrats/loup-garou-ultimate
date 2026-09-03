<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppButton from '../../components/ui/AppButton.vue'

import {
  DAY_VOTE_CHOICE,
  DAY_VOTE_DAILY_RESULT_STATUS,
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
  myVoteChoice?: DayVoteChoice | null
  isHost?: boolean
}>(), { currentPlayerId: null, myVoteChoice: null, isHost: false })

const emit = defineEmits<{
  propose: [targetPlayerId: PlayerId]
  approve: []
  reject: []
  start: []
  vote: [choice: DayVoteChoice]
}>()

const selectedTargetId = ref<PlayerId | ''>('')
const duplicateTargetPopup = ref(false)
const now = ref(Date.now())
let timer: number | null = null

const currentPlayer = computed(() => props.players.find((player) => player.id === props.currentPlayerId))
const livingPlayers = computed(() => props.players.filter((player) => !player.isHost && player.alive))
const availableTargets = computed(() => livingPlayers.value.filter((player) => (
  player.id !== props.currentPlayerId && !props.dayVote?.nominatedTargetIds.includes(player.id)
)))
const currentBallot = computed(() => props.myVoteChoice ? { choice: props.myVoteChoice } : null)
const alreadyNominated = computed(() => Boolean(props.currentPlayerId && props.dayVote?.nominatedByIds.includes(props.currentPlayerId)))
const canNominate = computed(() => Boolean(
  !props.isHost && currentPlayer.value?.alive && props.dayVote
  && (props.dayVote.status === DAY_VOTE_STATUS.IDLE || props.dayVote.status === DAY_VOTE_STATUS.RESOLVED)
  && !alreadyNominated.value,
))
const canVote = computed(() => Boolean(
  !props.isHost && props.dayVote?.status === DAY_VOTE_STATUS.ACTIVE
  && props.dayVote.eligibleVoterIds.includes(props.currentPlayerId ?? ('' as PlayerId))
  && !props.myVoteChoice
))
const remainingSeconds = computed(() => {
  if (!props.dayVote?.closesAt || props.dayVote.status !== DAY_VOTE_STATUS.ACTIVE) return 0
  return Math.max(0, Math.ceil((props.dayVote.closesAt - now.value) / 1_000))
})
const modalOpen = computed(() => Boolean(
  duplicateTargetPopup.value
  || (props.isHost && props.dayVote?.nomination && (
    props.dayVote.status === DAY_VOTE_STATUS.NOMINATION_PENDING
    || props.dayVote.status === DAY_VOTE_STATUS.NOMINATION_VALIDATED
  ))
  || (canVote.value && props.dayVote?.status === DAY_VOTE_STATUS.ACTIVE),
))

function updateBodyScrollLock(open: boolean): void {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
}

function proposeSelectedTarget(): void {
  if (!selectedTargetId.value) return
  if (props.dayVote?.nominatedTargetIds.includes(selectedTargetId.value)) {
    duplicateTargetPopup.value = true
    return
  }
  emit('propose', selectedTargetId.value)
  selectedTargetId.value = ''
}

onMounted(() => { timer = window.setInterval(() => { now.value = Date.now() }, 250) })
onBeforeUnmount(() => { if (timer !== null) window.clearInterval(timer) })
watch(modalOpen, updateBodyScrollLock, { immediate: true })
onBeforeUnmount(() => updateBodyScrollLock(false))
</script>

<template>
  <section v-if="dayVote" class="app-day-voting-panel" aria-live="polite" data-testid="day-voting-panel">
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
          <option v-for="player in availableTargets" :key="player.id" :value="player.id">{{ player.name }}</option>
        </select>
        <AppButton variant="primary" :disabled="!selectedTargetId || alreadyNominated" @click="proposeSelectedTarget">
          Nominer
        </AppButton>
      </div>
    </div>
    <p v-else-if="!props.isHost && currentPlayer?.alive && alreadyNominated" class="app-day-voting-info">
      Vous avez déjà nominé un joueur aujourd’hui.
    </p>

    <div v-if="dayVote.nomination" class="app-day-voting-nomination">
      <p><strong>{{ dayVote.nomination.nominatorName }}</strong> propose l’élimination de <strong>{{ dayVote.nomination.targetName }}</strong>.</p>
      <p v-if="dayVote.status === DAY_VOTE_STATUS.NOMINATION_VALIDATED" class="app-day-voting-info">✅ Nomination validée. Le MJ doit encore lancer le compte à rebours.</p>
    </div>

    <div v-if="dayVote.status === DAY_VOTE_STATUS.ACTIVE" class="app-day-voting-public-status">
      <strong>Vote en cours</strong>
      <span>{{ dayVote.yesCount }} Oui, {{ dayVote.noCount }} Non, majorité requise : {{ dayVote.threshold }}</span>
    </div>

    <div v-if="dayVote.status === DAY_VOTE_STATUS.RESOLVED && dayVote.result" class="app-day-voting-result">
      <strong>{{ dayVote.result.passed ? '✅ Majorité atteinte' : '❌ Majorité non atteinte' }}</strong>
      <span>{{ dayVote.result.yesCount }} Oui, {{ dayVote.result.noCount }} Non, majorité requise : {{ dayVote.result.threshold }}.</span>
    </div>

    <div v-if="dayVote.completedRounds.length" class="app-day-voting-daily-summary" data-testid="day-voting-daily-summary">
      <strong>📊 Résultat provisoire de la journée</strong>
      <p v-if="dayVote.dailyResult.status === DAY_VOTE_DAILY_RESULT_STATUS.WINNER">
        Candidat retenu : <strong>{{ dayVote.dailyResult.targetName }}</strong> avec {{ dayVote.dailyResult.yesCount }} Oui.
        L’exécution doit être enregistrée manuellement par le MJ.
      </p>
      <p v-else-if="dayVote.dailyResult.status === DAY_VOTE_DAILY_RESULT_STATUS.TIE">
        ⚖️ Égalité entre plusieurs nominations à {{ dayVote.dailyResult.yesCount }} Oui. Aucun candidat n’est retenu.
      </p>
      <p v-else>
        ❌ Aucune nomination n’a atteint la majorité. Aucun candidat n’est retenu.
      </p>
      <ol class="app-day-voting-rounds">
        <li v-for="round in dayVote.completedRounds" :key="round.nomination.id">
          <span>{{ round.nomination.targetName }} : {{ round.result.yesCount }} Oui, {{ round.result.noCount }} Non</span>
          <span>{{ round.result.passed ? 'Majorité atteinte' : 'Majorité non atteinte' }}</span>
        </li>
      </ol>
    </div>

    <Teleport to="body">
    <div v-if="isHost && dayVote.nomination && dayVote.status === DAY_VOTE_STATUS.NOMINATION_PENDING" class="app-day-voting-modal-backdrop">
      <section class="app-day-voting-modal" role="dialog" aria-modal="true" aria-labelledby="nomination-modal-title">
        <p class="app-kicker">📣 Nouvelle nomination</p>
        <h3 id="nomination-modal-title">{{ dayVote.nomination.nominatorName }} propose {{ dayVote.nomination.targetName }}</h3>
        <p>Validez-vous cette nomination pour préparer le vote du Village ?</p>
        <div class="app-day-voting-modal-actions">
          <AppButton variant="secondary" class="app-day-voting-modal-button app-day-voting-modal-button-secondary" @click="emit('reject')">❌ Refuser</AppButton>
          <AppButton variant="primary" class="app-day-voting-modal-button app-day-voting-modal-button-primary" @click="emit('approve')">✅ Valider</AppButton>
        </div>
      </section>
    </div>

    <div v-if="isHost && dayVote.nomination && dayVote.status === DAY_VOTE_STATUS.NOMINATION_VALIDATED" class="app-day-voting-modal-backdrop">
      <section class="app-day-voting-modal" role="dialog" aria-modal="true" aria-labelledby="start-vote-modal-title">
        <p class="app-kicker">✅ Nomination validée</p>
        <h3 id="start-vote-modal-title">Lancer le vote pour {{ dayVote.nomination.targetName }}</h3>
        <p>Les joueurs ne peuvent pas encore voter.</p>
        <AppButton variant="primary" block class="app-day-voting-modal-button app-day-voting-modal-button-primary" @click="emit('start')">▶️ Lancer le compte à rebours</AppButton>
      </section>
    </div>

    <div v-if="canVote" class="app-day-voting-modal-backdrop">
      <section class="app-day-voting-modal app-day-voting-vote-modal" role="dialog" aria-modal="true" aria-labelledby="vote-modal-title">
        <p class="app-kicker">🗳️ Vote du Village</p>
        <h3 id="vote-modal-title">{{ dayVote.nomination?.targetName }}</h3>
        <p class="app-day-voting-countdown">⏱️ {{ remainingSeconds }} secondes</p>
        <div class="app-day-voting-tally-large"><span>👍 {{ dayVote.yesCount }}</span><span>👎 {{ dayVote.noCount }}</span></div>
        <div v-if="currentBallot" class="app-day-voting-info">Votre vote est enregistré.</div>
        <div v-else class="app-day-voting-modal-actions app-day-voting-modal-actions-vote">
          <AppButton variant="secondary" class="app-day-voting-modal-button app-day-voting-modal-button-secondary" @click="emit('vote', DAY_VOTE_CHOICE.NO)">👎 Non</AppButton>
          <AppButton variant="primary" class="app-day-voting-modal-button app-day-voting-modal-button-primary" @click="emit('vote', DAY_VOTE_CHOICE.YES)">👍 Oui</AppButton>
        </div>
      </section>
    </div>

    <div v-if="duplicateTargetPopup" class="app-day-voting-modal-backdrop" @click.self="duplicateTargetPopup = false">
      <section class="app-day-voting-modal" role="alertdialog" aria-modal="true">
        <p class="app-kicker">⚠️ Nomination impossible</p>
        <h3>Cette personne a déjà été nominée aujourd’hui.</h3>
        <p>Choisissez une autre cible vivante.</p>
        <AppButton variant="primary" class="app-day-voting-modal-button app-day-voting-modal-button-primary" @click="duplicateTargetPopup = false">Compris</AppButton>
      </section>
    </div>
    </Teleport>
  </section>
</template>

<style scoped>
.app-day-voting-panel { display: grid; gap: 16px; padding: 20px; border: 1px solid var(--lgu-color-border-strong); border-radius: 20px; background: var(--lgu-surface-card); }
.app-day-voting-header, .app-day-voting-nomination, .app-day-voting-result { display: grid; gap: 8px; }
.app-day-voting-header p, .app-day-voting-header h3, .app-day-voting-nomination p, .app-day-voting-result span, .app-day-voting-result strong { margin: 0; }
.app-day-voting-header .app-kicker { color: var(--lgu-color-brand-primary); font-size: .8rem; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }
.app-day-voting-form-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.app-day-voting-form-row .app-input { min-width: 0; flex: 1 1 220px; }
.app-day-voting-info { color: var(--lgu-color-brand-primary); font-weight: 700; }
.app-day-voting-daily-summary { display: grid; gap: 8px; padding: 14px; border-radius: 14px; background: var(--lgu-color-warning-soft); }
.app-day-voting-daily-summary p { margin: 0; line-height: 1.45; }
.app-day-voting-rounds { display: grid; gap: 5px; margin: 0; padding-left: 20px; color: var(--lgu-color-text-secondary); font-size: .9rem; }
.app-day-voting-rounds li { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.app-day-voting-rounds li span:last-child { color: var(--lgu-color-brand-primary); font-weight: 700; }

.app-day-voting-public-status, .app-day-voting-result { display: grid; gap: 6px; padding: 12px 14px; border-radius: 14px; background: var(--lgu-color-surface-soft); }
.app-day-voting-modal-backdrop { position: fixed; z-index: 1000; inset: 0; display: grid; place-items: center; overflow-y: auto; padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); background: var(--lgu-surface-overlay); backdrop-filter: blur(8px); }
.app-day-voting-modal { display: grid; width: min(100%, 560px); max-height: calc(100dvh - 32px); overflow-y: auto; gap: 16px; margin: auto; padding: 28px; border: 2px solid var(--lgu-color-brand-primary); border-radius: 28px; background: var(--lgu-color-surface-1); box-shadow: 0 24px 80px rgb(0 0 0 / 45%); text-align: center; }
.app-day-voting-modal h3, .app-day-voting-modal p { margin: 0; }
.app-day-voting-modal .app-kicker { color: var(--lgu-color-brand-primary); font-size: .85rem; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
.app-day-voting-modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.app-day-voting-modal-button { min-height: 76px; border: 0; border-radius: 18px; padding: 16px; color: #fff; font-size: 1.25rem; font-weight: 900; cursor: pointer; }
.app-day-voting-modal-button-primary { background: linear-gradient(135deg, var(--lgu-color-brand-primary-pressed), var(--lgu-color-brand-primary-hover)); }
.app-day-voting-modal-button-secondary { background: var(--lgu-color-surface-3); }
.app-day-voting-vote-modal { width: min(100%, 620px); }
.app-day-voting-countdown { color: var(--lgu-color-brand-primary); font-size: clamp(2.2rem, 8vw, 4rem); font-weight: 950; line-height: 1; }
.app-day-voting-tally-large { display: flex; justify-content: center; gap: 24px; font-size: 1.5rem; font-weight: 900; }
@media (max-width: 600px) { .app-day-voting-modal-backdrop { place-items: start center; padding-top: max(12px, env(safe-area-inset-top)); padding-bottom: max(12px, env(safe-area-inset-bottom)); } .app-day-voting-modal { max-height: calc(100dvh - 24px); padding: 22px 16px; } .app-day-voting-modal-actions { grid-template-columns: 1fr; } .app-day-voting-modal-button { min-height: 68px; } .app-day-voting-form-row { display: grid; grid-template-columns: 1fr; } .app-day-voting-form-row .app-btn { width: 100%; } }
</style>
