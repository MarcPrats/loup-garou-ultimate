<script setup lang="ts">
import { computed, ref } from 'vue'

import type { PublicPlayer } from '@lgu/contracts'

import ConfirmDialog from '../components/ConfirmDialog.vue'
import FeedbackBanner from '../components/FeedbackBanner.vue'
import InviteLink from '../components/InviteLink.vue'
import LobbyRoster from '../components/LobbyRoster.vue'
import { useLobbyStore } from '../stores/lobby'

const lobby = useLobbyStore()
const pendingKick = ref<PublicPlayer | null>(null)
const confirmingLeave = ref(false)

const inviteUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/`
})
const startGuidance = computed(() => {
  const room = lobby.room
  if (!room) return ''
  const current = lobby.connectedRegularPlayerCount
  if (current < room.minimumPlayers) {
    const missing = room.minimumPlayers - current
    return `${missing} joueur${missing > 1 ? 's' : ''} encore nécessaire${missing > 1 ? 's' : ''}.`
  }
  if (!room.canStart) return 'Tous les joueurs doivent être connectés.'
  return 'Tout est prêt. Vous pouvez lancer la partie.'
})

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
  <main class="min-h-screen px-4 py-8 text-white sm:py-12">
    <section class="mx-auto w-full max-w-2xl rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur sm:p-10">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-sm font-bold uppercase tracking-[0.22em] text-lgu-orange">
            Salle d’attente
          </p>
          <h1 class="mt-2 font-display text-3xl font-bold sm:text-5xl">
            La meute se rassemble
          </h1>
        </div>
        <span
          v-if="lobby.isHost"
          class="w-fit rounded-full bg-gradient-to-r from-lgu-orange to-lgu-blue px-4 py-2 text-sm font-black"
        >
          Maître du jeu
        </span>
      </header>

      <div class="mt-8">
        <InviteLink :value="inviteUrl" @copied="lobby.showCopiedNotice" />
      </div>

      <div class="mt-8">
        <LobbyRoster
          :host="lobby.host"
          :players="lobby.regularPlayers"
          :current-player-id="lobby.currentPlayer?.id ?? null"
          :can-kick="lobby.isHost"
          :kicking-player-id="lobby.kickingPlayerId"
          @kick="pendingKick = $event"
        />
      </div>

      <FeedbackBanner
        v-if="lobby.error"
        class="mt-6"
        :message="lobby.error.message"
        variant="error"
      />

      <section class="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
        <template v-if="lobby.isHost">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="font-bold text-white">
                {{ lobby.connectedRegularPlayerCount }} / {{ lobby.room?.maximumPlayers ?? 12 }} joueurs
              </p>
              <p class="mt-1 text-sm text-slate-400">{{ startGuidance }}</p>
            </div>
            <span
              class="h-3 w-3 shrink-0 rounded-full"
              :class="lobby.room?.canStart ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'"
              aria-hidden="true"
            />
          </div>
          <button
            type="button"
            class="mt-5 w-full rounded-2xl bg-gradient-to-r from-lgu-orange to-lgu-blue px-6 py-4 text-lg font-black shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="!lobby.room?.canStart || lobby.starting"
            @click="lobby.start"
          >
            {{ lobby.starting ? 'Lancement…' : 'Démarrer la partie' }}
          </button>
        </template>
        <template v-else>
          <p class="text-center font-semibold text-slate-200">
            En attente du lancement par le maître du jeu…
          </p>
          <p class="mt-2 text-center text-sm text-slate-400">
            Gardez cette page ouverte. Votre rôle apparaîtra automatiquement.
          </p>
        </template>
      </section>

      <button
        type="button"
        class="mt-5 w-full rounded-2xl border border-white/10 px-6 py-3 font-bold text-slate-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
        :disabled="lobby.leaving"
        @click="confirmingLeave = true"
      >
        {{ lobby.leaving ? 'Départ…' : 'Quitter la partie' }}
      </button>
    </section>

    <ConfirmDialog
      v-if="pendingKick"
      id="kick-dialog"
      title="Expulser ce joueur ?"
      :description="`${pendingKick.name} devra rejoindre de nouveau pour revenir dans la partie.`"
      confirm-label="Expulser"
      destructive
      @cancel="pendingKick = null"
      @confirm="confirmKick"
    />

    <ConfirmDialog
      v-if="confirmingLeave"
      id="leave-dialog"
      title="Quitter la partie ?"
      description="Votre session sera fermée. Si la partie a commencé, votre attribution restera visible au maître du jeu."
      confirm-label="Quitter"
      destructive
      @cancel="confirmingLeave = false"
      @confirm="confirmLeave"
    />
  </main>
</template>
