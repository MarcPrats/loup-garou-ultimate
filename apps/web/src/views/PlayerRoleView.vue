<script setup lang="ts">
import { ref } from 'vue'

import ConfirmDialog from '../components/ConfirmDialog.vue'
import FeedbackBanner from '../components/FeedbackBanner.vue'
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
  <main class="min-h-screen px-4 py-10 text-white sm:py-14">
    <div class="mx-auto w-full max-w-4xl">
      <PlayerAssignmentPanel
        v-if="lobby.privateAssignment"
        :assignment="lobby.privateAssignment"
        @copied="lobby.showCopiedNotice"
      />

      <section
        v-else
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
        class="mx-auto mt-8 block rounded-2xl border border-white/15 px-6 py-3 font-bold text-slate-200 hover:bg-white/10"
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
