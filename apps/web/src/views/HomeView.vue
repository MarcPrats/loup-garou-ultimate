<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { API_ROUTE, healthResponseSchema } from '@lgu/contracts'

import FeedbackBanner from '../components/FeedbackBanner.vue'
import { API_STATE, CONNECTION_STATE, type ApiState } from '../constants/app'
import { useLobbyStore } from '../stores/lobby'

const lobby = useLobbyStore()
const playerName = ref('')
const apiState = ref<ApiState>(API_STATE.CHECKING)
const normalizedName = computed(() => playerName.value.trim())
const canSubmit = computed(() => (
  normalizedName.value.length > 0
  && lobby.initialized
  && !lobby.hasStoredSession
  && !lobby.entering
  && lobby.connectionState === CONNECTION_STATE.ONLINE
))

async function checkHealth(): Promise<void> {
  try {
    const response = await fetch(API_ROUTE.HEALTH)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    healthResponseSchema.parse(await response.json())
    apiState.value = API_STATE.READY
  } catch {
    apiState.value = API_STATE.ERROR
  }
}

async function submit(): Promise<void> {
  if (!canSubmit.value) return
  await lobby.enter(normalizedName.value)
}

onMounted(() => {
  void lobby.initialize()
  void checkHealth()
})
</script>

<template>
  <main class="grid min-h-screen place-items-center px-4 py-12 text-white">
    <section class="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-900/80 p-7 shadow-2xl backdrop-blur sm:p-10">
      <p class="text-sm font-bold uppercase tracking-[0.25em] text-lgu-orange">
        Loup Garou Ultimate
      </p>
      <h1 class="mt-3 font-display text-4xl font-bold leading-tight sm:text-6xl">
        Rejoignez la partie
      </h1>
      <p class="mt-5 leading-7 text-slate-300">
        Entrez votre prénom. La première personne connectée devient automatiquement maître du jeu.
      </p>

      <section
        v-if="lobby.hasStoredSession && !lobby.hasSession"
        class="mt-8 rounded-2xl border border-sky-400/25 bg-sky-400/10 p-5"
        aria-live="polite"
      >
        <h2 class="font-bold text-sky-100">Restauration de votre session</h2>
        <p class="mt-2 text-sm leading-6 text-sky-100/80">
          Nous essayons de retrouver votre place dans la partie. Ne créez pas une nouvelle identité pendant la reconnexion.
        </p>
        <div class="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            class="rounded-xl bg-sky-500 px-4 py-3 font-bold text-white disabled:opacity-50"
            :disabled="lobby.restoringSession"
            @click="lobby.retryRestoration"
          >
            {{ lobby.restoringSession ? 'Restauration…' : 'Réessayer' }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-white/15 px-4 py-3 font-bold text-slate-200 hover:bg-white/10"
            @click="lobby.startNewSession"
          >
            Abandonner cette session
          </button>
        </div>
      </section>

      <form v-else class="mt-8 space-y-5" @submit.prevent="submit">
        <div>
          <label for="player-name" class="text-sm font-bold text-slate-200">
            Votre prénom
          </label>
          <input
            id="player-name"
            v-model="playerName"
            name="playerName"
            type="text"
            required
            maxlength="40"
            autocomplete="nickname"
            placeholder="Marc"
            class="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-lg text-white placeholder:text-slate-500 focus:border-lgu-orange"
          >
        </div>

        <FeedbackBanner
          v-if="lobby.error"
          :message="lobby.error.message"
          variant="error"
        />
        <FeedbackBanner
          v-else-if="apiState === API_STATE.ERROR && lobby.connectionState !== CONNECTION_STATE.ONLINE"
          message="Le serveur est indisponible. Vérifiez que le backend V3 est démarré."
          variant="warning"
        />

        <button
          type="submit"
          class="w-full rounded-2xl bg-gradient-to-r from-lgu-orange to-lgu-blue px-6 py-4 text-lg font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canSubmit"
        >
          {{ lobby.entering ? 'Connexion…' : 'Créer ou rejoindre la partie' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-400">
        Une seule partie partagée, jusqu’à 12 joueurs plus le maître du jeu.
      </p>
    </section>
  </main>
</template>
