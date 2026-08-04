<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import FeedbackBanner from '../components/FeedbackBanner.vue'
import {
  CONNECTION_STATE,
  LEGACY_PAGE,
  ROUTE_PATH,
} from '../constants/app'
import { useLobbyStore } from '../stores/lobby'

const lobby = useLobbyStore()
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

onMounted(() => void lobby.initialize())
</script>

<template>
  <main class="legacy-page legacy-home-page">
    <section v-if="lobby.hasStoredSession && !lobby.hasSession" class="legacy-screen legacy-home-container" aria-live="polite">
      <h1>Loup Garou Ultime</h1>
      <h2>Restauration de votre session</h2>
      <p class="legacy-subtitle">Nous essayons de retrouver votre place dans la partie.</p>
      <FeedbackBanner v-if="lobby.error" :message="lobby.error.message" variant="error" />
      <div class="legacy-button-group">
        <button type="button" class="legacy-btn legacy-btn-primary" :disabled="lobby.restoringSession" @click="lobby.retryRestoration">
          {{ lobby.restoringSession ? 'Restauration…' : 'Réessayer' }}
        </button>
        <button type="button" class="legacy-btn legacy-btn-back" @click="lobby.startNewSession">
          Abandonner cette session
        </button>
      </div>
    </section>

    <section v-else-if="enteringName" class="legacy-screen legacy-home-container">
      <h2>Entrez votre nom</h2>
      <form @submit.prevent="submit">
        <input
          id="player-name-input"
          v-model="playerName"
          type="text"
          maxlength="20"
          autocomplete="off"
          placeholder="Votre nom..."
          class="legacy-text-input"
          autofocus
        >
        <FeedbackBanner v-if="lobby.error" :message="lobby.error.message" variant="error" />
        <div class="legacy-button-group">
          <button type="submit" class="legacy-btn legacy-btn-primary" :disabled="!canSubmit">
            {{ lobby.entering ? 'Connexion…' : 'Continuer' }}
          </button>
          <button type="button" class="legacy-btn legacy-btn-back" @click="enteringName = false">
            Retour
          </button>
        </div>
      </form>
    </section>

    <section v-else class="legacy-home-shell">
      <h1>Loup Garou Ultime</h1>
      <nav class="legacy-home-actions" aria-label="Actions principales">
        <a id="entry-btn" :href="ROUTE_PATH.ENTRY" class="legacy-home-action legacy-home-action-primary">
          🎮 Lancer la partie
        </a>
        <a :href="LEGACY_PAGE.RULES" class="legacy-home-action">📜 Règles</a>
        <a :href="LEGACY_PAGE.WIKI" class="legacy-home-action" target="_blank" rel="noopener noreferrer">
          📚 Wiki des règles
        </a>
      </nav>
    </section>
  </main>
</template>
