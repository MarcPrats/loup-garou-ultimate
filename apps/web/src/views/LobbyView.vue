<script setup lang="ts">
import { computed, ref } from 'vue'

import type { PublicPlayer } from '@lgu/contracts'

import ConfirmDialog from '../components/ConfirmDialog.vue'
import FeedbackBanner from '../components/FeedbackBanner.vue'
import { ROUTE_PATH } from '../constants/app'
import { appPath } from '../constants/paths'
import { useLobbyStore } from '../stores/lobby'

const lobby = useLobbyStore()
const pendingKick = ref<PublicPlayer | null>(null)
const confirmingLeave = ref(false)
const copying = ref(false)
const copyError = ref(false)
const inviteUrl = computed(() => typeof window === 'undefined' ? '' : `${window.location.origin}/waiting_room`)

async function copyInvite(): Promise<void> {
  copying.value = true
  copyError.value = false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteUrl.value)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = inviteUrl.value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.append(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      textarea.remove()
      if (!copied) throw new Error('Copy command failed')
    }
    lobby.showCopiedNotice()
  } catch {
    copyError.value = true
  } finally {
    copying.value = false
  }
}
async function confirmKick(): Promise<void> {
  if (!pendingKick.value) return
  const playerId = pendingKick.value.id
  pendingKick.value = null
  await lobby.kick(playerId)
}
async function confirmLeave(): Promise<void> {
  confirmingLeave.value = false
  await lobby.leave()
}
</script>

<template>
  <main class="app-page">
    <section class="app-screen app-game-container">
      <header class="app-room-header">
        <h2>Salle d'Attente</h2>
        <p class="app-room-limit-hint">Jusqu'à 12 joueurs peuvent rejoindre la salle (hors maître du jeu).</p>
        <div class="app-invitation-container">
          <p class="app-invitation-label">🔗 Lien d'invitation</p>
          <div class="app-invitation-group">
            <input :value="inviteUrl" readonly class="app-invitation-link" aria-label="Lien d'invitation">
            <button type="button" class="app-copy-button" :disabled="copying" @click="copyInvite">📋 {{ copying ? 'Copie…' : 'Copier' }}</button>
          </div>
          <p v-if="copyError" class="app-copy-error" role="alert">Copie impossible. Sélectionnez le lien et copiez-le manuellement.</p>
        </div>
      </header>

      <section v-if="lobby.host" class="app-roster-section">
        <h3>Maître du Jeu</h3>
        <div class="app-players-list">
          <div class="app-player-card">
            <span class="app-player-name">{{ lobby.host.name }}</span>
            <span class="app-host-badge">Hôte</span>
          </div>
        </div>
      </section>

      <section class="app-roster-section">
        <h3>Joueurs ({{ lobby.regularPlayers.length }})</h3>
        <div class="app-players-list">
          <div v-for="player in lobby.regularPlayers" :key="player.id" class="app-player-card">
            <span class="app-player-name">{{ player.name }}<small v-if="player.id === lobby.currentPlayer?.id"> (vous)</small></span>
            <button v-if="lobby.isHost && player.id !== lobby.currentPlayer?.id" type="button" class="app-kick-button" @click="pendingKick = player">Expulser</button>
          </div>
          <p v-if="lobby.regularPlayers.length === 0" class="app-waiting-text">Aucun joueur pour le moment.</p>
        </div>
      </section>

      <FeedbackBanner v-if="lobby.error" :message="lobby.error.message" variant="error" />
      <div class="app-waiting-actions">
        <button v-if="lobby.isHost" type="button" class="app-btn app-btn-primary" :disabled="!lobby.room?.canStart || lobby.starting" @click="lobby.start">
          {{ lobby.starting ? 'Lancement…' : '🎮 Démarrer la Partie' }}
        </button>
        <p v-else class="app-waiting-text">En attente du lancement par l'hôte...</p>
        <a :href="appPath(ROUTE_PATH.RULES)" class="app-btn app-btn-secondary">📖 Consulter les règles</a>
        <button type="button" class="app-btn app-btn-back" :disabled="lobby.leaving" @click="confirmingLeave = true">
          {{ lobby.leaving ? 'Départ…' : 'Quitter' }}
        </button>
      </div>
    </section>

    <ConfirmDialog v-if="pendingKick" id="kick-dialog" title="Expulser ce joueur ?" :description="`${pendingKick.name} devra rejoindre de nouveau pour revenir dans la partie.`" confirm-label="Expulser" destructive @cancel="pendingKick = null" @confirm="confirmKick" />
    <ConfirmDialog v-if="confirmingLeave" id="leave-dialog" title="Quitter la partie ?" description="Votre session sera fermée." confirm-label="Quitter" destructive @cancel="confirmingLeave = false" @confirm="confirmLeave" />
  </main>
</template>
