<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import FeedbackBanner from '../components/FeedbackBanner.vue'
import {
  CONNECTION_STATE,
  PUBLIC_LINK,
  ROUTE_PATH,
} from '../constants/app'
import { appPath } from '../constants/paths'
import { useLobbyStore } from '../stores/lobby'

const lobby = useLobbyStore()
const staticMode = import.meta.env.VITE_STATIC_MODE === 'true'
const route = useRoute()
const enteringName = ref(route.name === 'entry')
const playerName = ref('')
const normalizedName = computed(() => playerName.value.trim())
const canSubmit = computed(() => (
  normalizedName.value.length > 0
  && lobby.initialized
  && !lobby.hasStoredSession
  && !lobby.entering
  && lobby.connectionState === CONNECTION_STATE.ONLINE
))

async function submit(): Promise<void> {
  if (!canSubmit.value) return
  await lobby.enter(normalizedName.value)
}

onMounted(() => {
  if (!staticMode) void lobby.initialize()
})
</script>

<template>
  <main class="app-page app-home-page">
    <section v-if="lobby.hasStoredSession && !lobby.hasSession" class="app-screen app-home-container" aria-live="polite">
      <h1>Loup Garou Ultime</h1>
      <h2>Restauration de votre session</h2>
      <p class="app-subtitle">Nous essayons de retrouver votre place dans la partie.</p>
      <FeedbackBanner v-if="lobby.error" :message="lobby.error.message" variant="error" />
      <div class="app-button-group">
        <button type="button" class="app-btn app-btn-primary" :disabled="lobby.restoringSession" @click="lobby.retryRestoration">
          {{ lobby.restoringSession ? 'Restauration…' : 'Réessayer' }}
        </button>
        <button type="button" class="app-btn app-btn-back" @click="lobby.startNewSession">
          Abandonner cette session
        </button>
      </div>
    </section>

    <section v-else-if="enteringName" class="app-screen app-home-container">
      <h2>Entrez votre nom</h2>
      <form @submit.prevent="submit">
        <input
          id="player-name-input"
          v-model="playerName"
          type="text"
          maxlength="20"
          autocomplete="off"
          placeholder="Votre nom..."
          class="app-text-input"
          autofocus
        >
        <FeedbackBanner v-if="lobby.error" :message="lobby.error.message" variant="error" />
        <div class="app-button-group">
          <button type="submit" class="app-btn app-btn-primary" :disabled="!canSubmit">
            {{ lobby.entering ? 'Connexion…' : 'Continuer' }}
          </button>
          <button type="button" class="app-btn app-btn-back" @click="enteringName = false">
            Retour
          </button>
        </div>
      </form>
    </section>

    <section v-else class="app-home-shell">
      <h1>Loup Garou Ultime</h1>
      <nav class="app-home-actions" aria-label="Actions principales">
        <a v-if="!staticMode" id="entry-btn" :href="appPath(ROUTE_PATH.ENTRY)" class="app-home-action app-home-action-primary">
          🎮 Créer / Rejoindre la partie
        </a>
        <a :href="appPath(ROUTE_PATH.RULES)" class="app-home-action">📜 Règles</a>
        <a :href="PUBLIC_LINK.WIKI" class="app-home-action" target="_blank" rel="noopener noreferrer">
          📚 Wiki des règles
        </a>
      </nav>
    </section>
  </main>
</template>
