<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { LobbySnapshot } from '@lgu/contracts'

import FeedbackBanner from '../components/FeedbackBanner.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppInput from '../components/ui/AppInput.vue'
import {
  CONNECTION_STATE,
  PUBLIC_LINK,
  ROUTE_NAME,
  ROUTE_PATH,
} from '../constants/app'
import { appPath } from '../constants/paths'
import { useLobbyStore } from '../stores/lobby'

const lobby = useLobbyStore()
const staticMode = import.meta.env.VITE_STATIC_MODE === 'true'
const route = useRoute()
const router = useRouter()
const enteringName = ref(route.name === ROUTE_NAME.LOBBIES || typeof route.params.lobbyId === 'string')
const playerName = ref('')
const normalizedName = computed(() => playerName.value.trim())
const lobbyPlayerCount = (lobby: LobbySnapshot): number => (
  lobby.players.filter((player) => !player.isHost).length
)
const submitting = ref(false)
const preparingInvite = ref(false)
const joiningLobbyId = ref<string | null>(null)
const inviteLobbyId = computed(() => {
  if (typeof route.params.lobbyId === 'string') return route.params.lobbyId
  if (typeof route.query.lobby === 'string') return route.query.lobby
  return null
})
const inviteMode = computed(() => Boolean(inviteLobbyId.value))
const canSubmit = computed(() => (
  normalizedName.value.length > 0
  && lobby.initialized
  && !lobby.hasStoredSession
  && !submitting.value
  && !preparingInvite.value
  && lobby.connectionState === CONNECTION_STATE.ONLINE
))

async function submit(): Promise<void> {
  if (inviteMode.value) {
    await joinInviteLobby()
    return
  }
  if (!canSubmit.value) return
  submitting.value = true
  try {
    await lobby.createLobby(normalizedName.value)
  } finally {
    submitting.value = false
  }
}

async function joinInviteLobby(): Promise<void> {
  if (!inviteLobbyId.value || !canSubmit.value) return
  joiningLobbyId.value = inviteLobbyId.value
  try {
    await lobby.joinLobby(inviteLobbyId.value, normalizedName.value)
  } finally {
    joiningLobbyId.value = null
  }
}

async function joinLobby(availableLobby: LobbySnapshot): Promise<void> {
  if (!canSubmit.value) return
  joiningLobbyId.value = availableLobby.id
  try {
    await lobby.joinLobby(availableLobby.id, normalizedName.value)
  } finally {
    joiningLobbyId.value = null
  }
}

let lobbyRefreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  if (staticMode) return

  preparingInvite.value = inviteMode.value
  try {
    await lobby.initialize()
    if (inviteMode.value) {
      // A lobby link wins over a previously persisted session.
      if (lobby.hasStoredSession) await lobby.startNewSession()
      return
    }
    await lobby.listLobbies()
    lobbyRefreshTimer = setInterval(() => { void lobby.listLobbies() }, 10_000)
  } finally {
    preparingInvite.value = false
  }
})

onUnmounted(() => {
  if (lobbyRefreshTimer) clearInterval(lobbyRefreshTimer)
})
</script>

<template>
  <main class="app-page app-home-page">
    <section v-if="enteringName && inviteMode" class="app-screen app-home-container app-lobby app-lobby-invite-only">
      <h2>Rejoindre la partie</h2>
      <p class="app-subtitle">Entrez votre nom pour rejoindre le lobby invité.</p>
      <p class="app-lobby-invite-hint">Lobby : <strong>{{ inviteLobbyId }}</strong></p>

      <form class="app-lobby-create-form" @submit.prevent="submit">
        <label for="player-name-input">Votre nom</label>
        <AppInput
          id="player-name-input"
          v-model="playerName"
          maxlength="20"
          autocomplete="off"
          placeholder="Votre nom..."
          class="app-text-input"
          autofocus
        />
        <FeedbackBanner v-if="lobby.error" :message="lobby.error.message" variant="error" />
        <AppButton type="submit" variant="primary" :disabled="!canSubmit || joiningLobbyId !== null" :loading="joiningLobbyId !== null">
          {{ joiningLobbyId ? 'Connexion…' : 'Rejoindre la partie' }}
        </AppButton>
      </form>
      <button type="button" class="app-btn app-btn-back" @click="router.push({ name: ROUTE_NAME.HOME })">
        Retour
      </button>
    </section>

    <section v-else-if="lobby.hasStoredSession && !lobby.hasSession" class="app-screen app-home-container" aria-live="polite">
      <h1>🐺 Loup Garou Ultime</h1>
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

    <section v-else-if="enteringName" class="app-screen app-home-container app-lobby">
      <h2>Rejoindre une partie</h2>
      <p class="app-subtitle">Choisissez un lobby existant ou créez-en un nouveau.</p>

      <form class="app-lobby-create-form" @submit.prevent="submit">
        <label for="player-name-input">Votre nom</label>
        <AppInput
          id="player-name-input"
          v-model="playerName"
          maxlength="20"
          autocomplete="off"
          placeholder="Votre nom..."
          class="app-text-input"
          autofocus
        />
        <AppButton type="submit" variant="primary" :disabled="!canSubmit" :loading="submitting">
          {{ submitting ? 'Création…' : '➕ Créer une partie' }}
        </AppButton>
      </form>

      <div class="app-lobby-list-header">
        <h3>Parties disponibles</h3>
        <button type="button" class="app-btn app-btn-back app-btn-compact app-lobby-refresh" :disabled="lobby.connectionState !== CONNECTION_STATE.ONLINE" @click="lobby.listLobbies" aria-label="Actualiser la liste des lobbies">
          Actualiser
        </button>
      </div>

      <div v-if="inviteLobbyId" class="app-lobby-invite-hint">
        <p>Vous avez reçu le lien du lobby <strong>{{ inviteLobbyId }}</strong>.</p>
        <button type="button" class="app-btn app-btn-primary" :disabled="!canSubmit || joiningLobbyId !== null" @click="joinInviteLobby">
          {{ joiningLobbyId === inviteLobbyId ? 'Connexion…' : 'Rejoindre ce lobby' }}
        </button>
      </div>
      <p v-if="lobby.availableLobbies.length === 0" class="app-lobby-empty">
        Aucune partie en attente. Créez la première.
      </p>
      <div v-else class="app-lobby-list">
        <article
          v-for="availableLobby in lobby.availableLobbies"
          :key="availableLobby.id"
          class="app-lobby-list-card"
          :class="{ highlighted: availableLobby.id === inviteLobbyId }"
        >
          <div>
            <strong>{{ availableLobby.players.find((player) => player.isHost)?.name ?? 'Partie' }}</strong>
            <span>{{ lobbyPlayerCount(availableLobby) }} / {{ availableLobby.maximumPlayers }} joueurs</span>
          </div>
          <button type="button" class="app-btn app-btn-primary" :disabled="!canSubmit || joiningLobbyId !== null" @click="joinLobby(availableLobby)">
            {{ joiningLobbyId === availableLobby.id ? 'Connexion…' : 'Rejoindre' }}
          </button>
        </article>
      </div>

      <FeedbackBanner v-if="lobby.error" :message="lobby.error.message" variant="error" />
      <button type="button" class="app-btn app-btn-back app-btn-secondary-action" @click="enteringName = false">
        Retour
      </button>
    </section>

    <section v-else class="app-home-shell">
      <h1>🐺 Loup Garou Ultime</h1>
      <nav class="app-home-actions" aria-label="Actions principales">
        <a v-if="!staticMode" id="lobbies-btn" :href="appPath(ROUTE_PATH.LOBBIES)" class="app-home-action app-home-action-primary">
          🎮 Créer / Rejoindre la partie
        </a>
        <a :href="appPath(ROUTE_PATH.RULES)" class="app-home-action">📜 Règles</a>
        <a :href="appPath(ROUTE_PATH.SIMULATOR)" class="app-home-action">🧪 Simulateur</a>
        <a :href="PUBLIC_LINK.WIKI" class="app-home-action" target="_blank" rel="noopener noreferrer">
          📚 Wiki des règles
        </a>
      </nav>
    </section>
  </main>
</template>
