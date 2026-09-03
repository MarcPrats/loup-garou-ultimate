<script setup lang="ts">
import { computed, ref } from 'vue'

import type { PublicPlayer } from '@lgu/contracts'

import ConfirmDialog from '../components/ConfirmDialog.vue'
import FeedbackBanner from '../components/FeedbackBanner.vue'
import HostDashboardPanel from '../components/HostDashboardPanel.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppInput from '../components/ui/AppInput.vue'
import AppSwitch from '../components/ui/AppSwitch.vue'
import { ROUTE_PATH } from '../constants/app'
import { appPath } from '../constants/paths'
import { useLobbyStore } from '../stores/lobby'

const lobby = useLobbyStore()
const pendingKick = ref<PublicPlayer | null>(null)
const confirmingLeave = ref(false)
const copying = ref(false)
const copyError = ref(false)
const inviteUrl = computed(() => {
  if (typeof window === 'undefined' || !lobby.lobby?.id) return ''
  return `${window.location.origin}${appPath(`/lobby/${lobby.lobby.id}`)}`
})

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
      <header class="app-lobby-header">
        <h2>Lobby</h2>
        <p class="app-lobby-limit-hint">Jusqu'à 12 joueurs peuvent rejoindre le lobby (hors maître du jeu).</p>
        <div class="app-invitation-container">
          <p class="app-invitation-label">🔗 Lien d'invitation</p>
          <div class="app-invitation-group">
            <AppInput :display-value="inviteUrl" readonly class="app-invitation-link" aria-label="Lien d'invitation" />
            <AppButton size="sm" class="app-copy-button" :disabled="copying" @click="copyInvite">📋 {{ copying ? 'Copie…' : 'Copier' }}</AppButton>
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

      <AppCard v-if="lobby.isHost" as="section" elevated class="app-lobby-option-panel" aria-labelledby="lobby-options-title">
        <div>
          <p class="app-lobby-option-kicker">⚙️ Options de la partie</p>
          <h3 id="lobby-options-title">Vote du Village</h3>
          <p class="app-lobby-option-description">Autoriser les nominations et les votes pendant les journées.</p>
        </div>
        <AppSwitch
          :model-value="lobby.lobby?.dayVotingEnabled ?? false"
          :disabled="lobby.updatingDayVoting"
          label="Activer le vote"
          input-test-id="day-voting-toggle"
          @update:model-value="lobby.setDayVotingEnabled"
        />
      </AppCard>

      <section class="app-roster-section">
        <h3>Joueurs ({{ lobby.regularPlayers.length }})</h3>
        <div class="app-players-list">
          <div v-for="player in lobby.regularPlayers" :key="player.id" class="app-player-card">
            <span class="app-player-name">{{ player.name }}<small v-if="player.id === lobby.currentPlayer?.id"> (vous)</small></span>
            <AppButton
              v-if="lobby.isHost && player.id !== lobby.currentPlayer?.id"
              variant="danger"
              size="sm"
              class="app-kick-button"
              @click="pendingKick = player"
            >Expulser</AppButton>
          </div>
          <p v-if="lobby.regularPlayers.length === 0" class="app-waiting-text">Aucun joueur pour le moment.</p>
        </div>
      </section>

      <section
        v-if="lobby.isHost && lobby.startPreview"
        class="app-start-preview-panel"
        aria-labelledby="start-preview-title"
      >
        <header class="app-start-preview-header">
          <p class="app-start-preview-kicker">🎭 Aperçu de la partie</p>
          <h3 id="start-preview-title">Vérifiez les rôles avant de lancer</h3>
          <p>Les joueurs restent dans le lobby jusqu’à votre confirmation.</p>
        </header>

        <HostDashboardPanel
          :dashboard="lobby.startPreview"
          :show-night-order="false"
          :show-rules-link="false"
        />

        <div class="app-start-preview-actions">
          <AppButton
            variant="secondary"
            :disabled="lobby.starting"
            @click="lobby.cancelStartPreview"
          >
            ❌ Annuler
          </AppButton>
          <AppButton
            variant="secondary"
            :disabled="lobby.starting"
            @click="lobby.redistributeStartPreview"
          >
            🔀 Redistribuer
          </AppButton>
          <AppButton
            variant="primary"
            :disabled="lobby.starting"
            :loading="lobby.starting"
            @click="lobby.confirmStart"
          >
            {{ lobby.starting ? 'Lancement…' : '✅ Confirmer et lancer' }}
          </AppButton>
        </div>
      </section>

      <FeedbackBanner v-if="lobby.error" :message="lobby.error.message" variant="error" />
      <div v-if="!lobby.startPreview" class="app-waiting-actions">
        <AppButton
          v-if="lobby.isHost"
          variant="primary"
          :disabled="!lobby.lobby?.canStart || lobby.starting"
          :loading="lobby.starting"
          @click="lobby.start"
        >
          {{ lobby.starting ? 'Lancement…' : '🎮 Démarrer la Partie' }}
        </AppButton>
        <p v-else class="app-waiting-text">En attente du lancement par l'hôte...</p>
        <a :href="appPath(ROUTE_PATH.RULES)" class="app-btn app-btn-secondary" target="_blank" rel="noopener noreferrer">📖 Consulter les règles</a>
        <AppButton
          variant="ghost"
          class="app-btn-back"
          :disabled="lobby.leaving"
          :loading="lobby.leaving"
          @click="confirmingLeave = true"
        >
          {{ lobby.leaving ? 'Départ…' : 'Quitter' }}
        </AppButton>
      </div>
    </section>

    <ConfirmDialog v-if="pendingKick" id="kick-dialog" title="Expulser ce joueur ?" :description="`${pendingKick.name} devra rejoindre de nouveau pour revenir dans la partie.`" confirm-label="Expulser" destructive @cancel="pendingKick = null" @confirm="confirmKick" />
    <ConfirmDialog v-if="confirmingLeave" id="leave-dialog" title="Quitter la partie ?" description="Votre session sera fermée." confirm-label="Quitter" destructive @cancel="confirmingLeave = false" @confirm="confirmLeave" />
  </main>
</template>


<style scoped>
.app-start-preview-panel {
  display: grid;
  gap: 20px;
  margin-top: 24px;
  padding: 24px;
  border: 1px solid var(--app-border-strong, rgba(255, 255, 255, .18));
  border-radius: 24px;
  background: var(--app-surface-raised, rgba(12, 28, 46, .78));
}
.app-start-preview-header {
  display: grid;
  gap: 6px;
}
.app-start-preview-kicker {
  margin: 0;
  color: var(--app-accent, var(--lgu-color-brand-primary));
  font-size: .82rem;
  font-weight: 800;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.app-start-preview-header h3,
.app-start-preview-header p { margin: 0; }
.app-start-preview-header h3 { font-size: clamp(1.3rem, 3vw, 1.9rem); }
.app-start-preview-header p:last-child { color: var(--app-text-muted, var(--lgu-color-text-muted)); }
.app-start-preview-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}
.app-lobby-option-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin: 22px 0;
  padding: 18px 20px;
  border: 1px solid var(--lgu-color-border-strong);
  border-radius: 18px;
  background: rgba(18, 40, 66, .7);
}
.app-lobby-option-kicker { margin: 0 0 4px; color: var(--app-accent, var(--lgu-color-brand-primary)); font-size: .78rem; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
.app-lobby-option-panel h3, .app-lobby-option-description { margin: 0; }
.app-lobby-option-description { margin-top: 5px; color: var(--app-muted, var(--lgu-color-text-muted)); font-size: .9rem; }
@media (max-width: 899px) { .app-lobby-option-panel { align-items: flex-start; flex-direction: column; } }
@media (max-width: 899px) {
  .app-start-preview-panel { padding: 16px 12px; border-radius: 18px; }
  .app-start-preview-actions { display: grid; grid-template-columns: 1fr; }
  .app-start-preview-actions .app-btn { width: 100%; }
}
</style>
