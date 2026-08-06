<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { RoomSnapshot } from '@lgu/contracts'

import FeedbackBanner from '../components/FeedbackBanner.vue'
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
const enteringName = ref(route.name === 'entry' || typeof route.params.lobbyId === 'string')
const playerName = ref('')
const normalizedName = computed(() => playerName.value.trim())
const roomPlayerCount = (room: RoomSnapshot): number => (
  room.players.filter((player) => !player.isHost).length
)
const submitting = ref(false)
const joiningRoomId = ref<string | null>(null)
const inviteMode = computed(() => Boolean(inviteRoomId.value))
const inviteRoomId = computed(() => {
  if (typeof route.params.lobbyId === 'string') return route.params.lobbyId
  if (typeof route.query.room === 'string') return route.query.room
  return null
})
const canSubmit = computed(() => (
  normalizedName.value.length > 0
  && lobby.initialized
  && !lobby.hasStoredSession
  && !submitting.value
  && lobby.connectionState === CONNECTION_STATE.ONLINE
))

async function submit(): Promise<void> {
  if (inviteMode.value) {
    await joinInviteRoom()
    return
  }
  if (!canSubmit.value) return
  submitting.value = true
  try {
    await lobby.createRoom(normalizedName.value)
  } finally {
    submitting.value = false
  }
}

async function joinInviteRoom(): Promise<void> {
  if (!inviteRoomId.value || !canSubmit.value) return
  joiningRoomId.value = inviteRoomId.value
  try {
    await lobby.joinRoom(inviteRoomId.value, normalizedName.value)
  } finally {
    joiningRoomId.value = null
  }
}

async function joinRoom(room: RoomSnapshot): Promise<void> {
  if (!canSubmit.value) return
  joiningRoomId.value = room.id
  try {
    await lobby.joinRoom(room.id, normalizedName.value)
  } finally {
    joiningRoomId.value = null
  }
}

let roomRefreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  if (!staticMode) {
    await lobby.initialize()
    await lobby.listRooms()
    roomRefreshTimer = setInterval(() => { void lobby.listRooms() }, 10_000)
  }
})

onUnmounted(() => {
  if (roomRefreshTimer) clearInterval(roomRefreshTimer)
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

    <section v-else-if="enteringName && inviteMode" class="app-screen app-home-container app-room-lobby app-room-invite-only">
      <h2>Rejoindre la partie</h2>
      <p class="app-subtitle">Entrez votre nom pour rejoindre la salle invitée.</p>
      <p class="app-room-invite-hint">Salle : <strong>{{ inviteRoomId }}</strong></p>

      <form class="app-room-create-form" @submit.prevent="submit">
        <label for="player-name-input">Votre nom</label>
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
        <button type="submit" class="app-btn app-btn-primary" :disabled="!canSubmit || joiningRoomId !== null">
          {{ joiningRoomId ? 'Connexion…' : 'Rejoindre la partie' }}
        </button>
      </form>
      <button type="button" class="app-btn app-btn-back" @click="router.push({ name: ROUTE_NAME.HOME })">
        Retour
      </button>
    </section>

    <section v-else-if="enteringName" class="app-screen app-home-container app-room-lobby">
      <h2>Rejoindre une partie</h2>
      <p class="app-subtitle">Choisissez une salle existante ou créez-en une nouvelle.</p>

      <form class="app-room-create-form" @submit.prevent="submit">
        <label for="player-name-input">Votre nom</label>
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
        <button type="submit" class="app-btn app-btn-primary" :disabled="!canSubmit">
          {{ submitting ? 'Création…' : '➕ Créer une partie' }}
        </button>
      </form>

      <div class="app-room-list-header">
        <h3>Parties disponibles</h3>
        <button type="button" class="app-btn app-btn-back" :disabled="lobby.connectionState !== CONNECTION_STATE.ONLINE" @click="lobby.listRooms">
          Actualiser
        </button>
      </div>

      <div v-if="inviteRoomId" class="app-room-invite-hint">
        <p>Vous avez reçu le lien de la salle <strong>{{ inviteRoomId }}</strong>.</p>
        <button type="button" class="app-btn app-btn-primary" :disabled="!canSubmit || joiningRoomId !== null" @click="joinInviteRoom">
          {{ joiningRoomId === inviteRoomId ? 'Connexion…' : 'Rejoindre cette salle' }}
        </button>
      </div>
      <p v-if="lobby.availableRooms.length === 0" class="app-room-empty">
        Aucune partie en attente. Créez la première.
      </p>
      <div v-else class="app-room-list">
        <article
          v-for="room in lobby.availableRooms"
          :key="room.id"
          class="app-room-list-card"
          :class="{ highlighted: room.id === inviteRoomId }"
        >
          <div>
            <strong>{{ room.players.find((player) => player.isHost)?.name ?? 'Partie' }}</strong>
            <span>{{ roomPlayerCount(room) }} / {{ room.maximumPlayers }} joueurs</span>
          </div>
          <button type="button" class="app-btn app-btn-primary" :disabled="!canSubmit || joiningRoomId !== null" @click="joinRoom(room)">
            {{ joiningRoomId === room.id ? 'Connexion…' : 'Rejoindre' }}
          </button>
        </article>
      </div>

      <FeedbackBanner v-if="lobby.error" :message="lobby.error.message" variant="error" />
      <button type="button" class="app-btn app-btn-back" @click="enteringName = false">
        Retour
      </button>
    </section>

    <section v-else class="app-home-shell">
      <h1>Loup Garou Ultime</h1>
      <nav class="app-home-actions" aria-label="Actions principales">
        <a v-if="!staticMode" id="entry-btn" :href="appPath(ROUTE_PATH.ENTRY)" class="app-home-action app-home-action-primary">
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
