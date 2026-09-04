<script setup lang="ts">
import { ref } from 'vue'

import { ROLE_ID } from '@lgu/game-core'

import { ROUTE_PATH } from '../constants/app'
import { appPath } from '../constants/paths'

import ConfirmDialog from '../components/ConfirmDialog.vue'
import DayVotingPanel from '../features/day-voting/DayVotingPanel.vue'
import FeedbackBanner from '../components/FeedbackBanner.vue'
import GameLogPanel from '../components/GameLogPanel.vue'
import GamePhasePanel from '../components/GamePhasePanel.vue'
import PlayerAssignmentPanel from '../components/PlayerAssignmentPanel.vue'
import { AppButton } from '../components/ui'
import { useLobbyStore } from '../stores/lobby'

const lobby = useLobbyStore()
const confirmingLeave = ref(false)

async function confirmLeave(): Promise<void> {
  confirmingLeave.value = false
  await lobby.leave()
}
</script>

<template>
  <main class="app-page">
    <div class="app-screen app-game-container">
      <section
        v-if="lobby.currentPlayer && !lobby.currentPlayer.alive"
        class="app-ghost-status-panel"
        role="status"
      >
        <p class="app-ghost-status-kicker">👻 Vous êtes un fantôme</p>
        <p class="app-ghost-status-message">
          💬 Vous avez toujours le droit de parler et vous disposez encore d’un dernier vote pour le reste de la partie.
        </p>
      </section>

      <PlayerAssignmentPanel
        v-if="lobby.privateAssignment"
        :assignment="lobby.privateAssignment"
        :dashboard="lobby.privateAssignment.role.id === ROLE_ID.LOUP_BLANC ? lobby.hostDashboard : null"
        :show-rules-link="false"
      />

      <section
        v-else-if="!lobby.privateAssignment"
        role="status"
        class="rounded-3xl border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl"
      >
        <span class="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-lgu-orange" aria-hidden="true" />
        <h1 class="mt-5 font-display text-3xl font-bold">Récupération de votre rôle…</h1>
        <p class="mt-3 text-slate-300">La connexion privée est en cours de restauration.</p>
      </section>

      <GamePhasePanel :phase="lobby.lobby?.gamePhase ?? null" :game-ended="lobby.lobby?.gameEnded ?? false" />

      <DayVotingPanel
        v-if="lobby.lobby?.dayVotingEnabled"
        :day-vote="lobby.lobby?.dayVote ?? null"
        :players="lobby.lobby?.players ?? []"
        :current-player-id="lobby.currentPlayer?.id ?? null"
        :my-vote-choice="lobby.dayVotePrivateStatus?.nominationId === lobby.lobby?.dayVote?.nomination?.id ? lobby.dayVotePrivateStatus?.choice ?? null : null"
        @propose="lobby.proposeDayNomination"
        @vote="lobby.submitDayVote"
      />

      <GameLogPanel
        :entries="lobby.lobby?.gameLog ?? []"
        :players="lobby.lobby?.players ?? []"
        :phase="lobby.lobby?.gamePhase ?? null"
        :current-player-id="lobby.currentPlayer?.id ?? null"
      />

      <a
        :href="appPath(ROUTE_PATH.RULES)"
        class="app-btn app-btn-secondary app-rules-button"
        target="_blank"
        rel="noopener noreferrer"
      >
        📖 Consulter les règles
      </a>

      <FeedbackBanner
        v-if="lobby.error"
        class="mt-6"
        :message="lobby.error.message"
        variant="error"
      />
      <AppButton
        class="app-btn-back app-leave-button"
        @click="confirmingLeave = true"
      >
        Quitter la partie
      </AppButton>
    </div>

    <ConfirmDialog
      v-if="confirmingLeave"
      id="role-leave-dialog"
      title="Quitter la partie ?"
      description="Votre lien de rôle sera révoqué."
      confirm-label="Quitter"
      destructive
      @cancel="confirmingLeave = false"
      @confirm="confirmLeave"
    />
  </main>
</template>
