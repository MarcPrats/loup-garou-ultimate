<script setup lang="ts">
import { ref } from 'vue'

import ConfirmDialog from '../components/ConfirmDialog.vue'
import FeedbackBanner from '../components/FeedbackBanner.vue'
import { useLobbyStore } from '../stores/lobby'

const lobby = useLobbyStore()
const confirmingLeave = ref(false)

async function confirmLeave(): Promise<void> {
  confirmingLeave.value = false
  await lobby.leave()
}
</script>

<template>
  <main class="grid min-h-screen place-items-center px-4 py-12 text-white">
    <section class="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl backdrop-blur sm:p-12">
      <p class="text-sm font-bold uppercase tracking-[0.22em] text-lgu-orange">
        Attribution reçue
      </p>
      <h1 class="mt-3 font-display text-4xl font-bold">Votre rôle est prêt</h1>
      <p class="mt-5 leading-7 text-slate-300">
        La transmission privée fonctionne. L’écran détaillé du rôle sera construit à l’étape suivante.
      </p>
      <FeedbackBanner
        v-if="lobby.error"
        class="mt-6 text-left"
        :message="lobby.error.message"
        variant="error"
      />
      <button
        type="button"
        class="mt-8 rounded-2xl border border-white/15 px-6 py-3 font-bold text-slate-200 hover:bg-white/10"
        @click="confirmingLeave = true"
      >
        Quitter la partie
      </button>
    </section>
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
