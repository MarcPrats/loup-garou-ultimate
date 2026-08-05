<script setup lang="ts">
import { ref } from 'vue'

import ConfirmDialog from '../components/ConfirmDialog.vue'
import FeedbackBanner from '../components/FeedbackBanner.vue'
import HostDashboardPanel from '../components/HostDashboardPanel.vue'
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
    <div class="app-screen app-gm-container">
      <HostDashboardPanel
        v-if="lobby.hostDashboard"
        :dashboard="lobby.hostDashboard"
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
      <button
        type="button"
        class="app-btn app-btn-back app-leave-button"
        @click="confirmingLeave = true"
      >
        Fermer la partie
      </button>
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
