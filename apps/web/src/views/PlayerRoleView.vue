<script setup lang="ts">
import { ref } from 'vue'

import { ROLE_ID } from '@lgu/game-core'

import ConfirmDialog from '../components/ConfirmDialog.vue'
import FeedbackBanner from '../components/FeedbackBanner.vue'
import GamePhasePanel from '../components/GamePhasePanel.vue'
import PlayerAssignmentPanel from '../components/PlayerAssignmentPanel.vue'
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
      <GamePhasePanel :phase="lobby.lobby?.gamePhase ?? null" />

      <PlayerAssignmentPanel
        v-if="lobby.privateAssignment"
        :assignment="lobby.privateAssignment"
        :dashboard="lobby.privateAssignment.role.id === ROLE_ID.LOUP_BLANC ? lobby.hostDashboard : null"
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

      <FeedbackBanner
        v-if="lobby.error"
        class="mt-6"
        :message="lobby.error.message"
        variant="error"
      />
      <button
        type="button"
        class="app-btn app-btn-back app-leave-button"
        @click="confirmingLeave = true"
      >
        Quitter la partie
      </button>
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
