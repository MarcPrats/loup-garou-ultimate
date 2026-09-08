<script setup lang="ts">
import { computed, ref } from 'vue'

import ConfirmDialog from '../components/ConfirmDialog.vue'
import DayVotingPanel from '../features/day-voting/DayVotingPanel.vue'
import FeedbackBanner from '../components/FeedbackBanner.vue'
import GameLogPanel from '../components/GameLogPanel.vue'
import GamePhasePanel from '../components/GamePhasePanel.vue'
import HostDashboardPanel from '../components/HostDashboardPanel.vue'
import InviteLinkShare from '../components/InviteLinkShare.vue'
import { AppButton } from '../components/ui'
import { useLobbyStore } from '../stores/lobby'

const lobby = useLobbyStore()
const confirmingLeave = ref(false)
const deadPlayerIds = computed(() => (
  lobby.lobby?.players.filter((player) => !player.isHost && !player.alive).map((player) => player.id) ?? []
))

async function confirmLeave(): Promise<void> {
  confirmingLeave.value = false
  await lobby.leave()
}
</script>

<template>
  <main class="app-page">
    <div class="app-screen app-gm-container">
      <GamePhasePanel
        :phase="lobby.lobby?.gamePhase ?? null"
        :game-ended="lobby.lobby?.gameEnded ?? false"
        :can-advance="lobby.isHost && !lobby.lobby?.gameEnded"
        :can-rewind="!lobby.lobby?.gameEnded && (lobby.lobby?.gamePhase?.period === 'day' || (lobby.lobby?.gamePhase?.number ?? 1) > 1)"
        :advancing="lobby.advancingPhase"
        @advance="lobby.advanceGamePhase"
        @rewind="lobby.rewindGamePhase"
      />

      <section v-if="lobby.reconnectRequests.length > 0" class="app-reconnect-requests" aria-live="polite">
        <h2>Demandes de reconnexion</h2>
        <p class="app-subtitle">Vérifiez l’identité du joueur avant de transférer sa place.</p>
        <div v-for="request in lobby.reconnectRequests" :key="request.requestId" class="app-reconnect-request">
          <strong>{{ request.playerName }}</strong>
          <div class="app-button-group">
            <AppButton variant="primary" size="sm" @click="lobby.approveReconnect(request.requestId)">Autoriser</AppButton>
            <AppButton class="app-btn-back" size="sm" @click="lobby.rejectReconnect(request.requestId)">Refuser</AppButton>
          </div>
        </div>
      </section>

      <DayVotingPanel
        v-if="lobby.lobby?.dayVotingEnabled"
        :day-vote="lobby.lobby?.dayVote ?? null"
        :players="lobby.lobby?.players ?? []"
        :is-host="true"
        @approve="lobby.approveDayNomination"
        @reject="lobby.rejectDayNomination"
        @start="lobby.startDayVote"
      />

      <GameLogPanel
        :entries="lobby.lobby?.gameLog ?? []"
        :players="lobby.lobby?.players ?? []"
        :phase="lobby.lobby?.gamePhase ?? null"
        :can-edit="lobby.isHost"
        :can-record="lobby.isHost && !lobby.lobby?.gameEnded"
        :busy="lobby.updatingGameLog"
        @record="lobby.recordGameLogEvent"
        @edit="lobby.editGameLogEvent"
        @delete="lobby.deleteGameLogEvent"
      />

      <HostDashboardPanel
        v-if="lobby.hostDashboard"
        :dashboard="lobby.hostDashboard"
        :dead-player-ids="deadPlayerIds"
        @copied="lobby.showCopiedNotice"
      />

      <section
        v-else
        role="status"
        class="rounded-3xl border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl"
      >
        <span class="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-lgu-orange" aria-hidden="true" />
        <h1 class="mt-5 font-display text-3xl font-bold">Récupération du tableau…</h1>
        <p class="mt-3 text-slate-300">Les attributions privées sont en cours de restauration.</p>
      </section>

      <FeedbackBanner
        v-if="lobby.error"
        class="mt-6"
        :message="lobby.error.message"
        variant="error"
      />

      <InviteLinkShare />

      <AppButton
        class="app-btn-back app-leave-button"
        @click="confirmingLeave = true"
      >
        Fermer la partie
      </AppButton>
    </div>

    <ConfirmDialog
      v-if="confirmingLeave"
      id="host-leave-dialog"
      title="Fermer la partie ?"
      description="Tous les participants seront déconnectés et les liens privés deviendront invalides."
      confirm-label="Fermer la partie"
      destructive
      @cancel="confirmingLeave = false"
      @confirm="confirmLeave"
    />
  </main>
</template>
