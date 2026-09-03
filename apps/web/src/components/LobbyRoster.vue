<script setup lang="ts">
import type { PlayerId, PublicPlayer } from '@lgu/contracts'

import AppBadge from './ui/AppBadge.vue'
import AppButton from './ui/AppButton.vue'

defineProps<{
  host: PublicPlayer | null
  players: PublicPlayer[]
  currentPlayerId: PlayerId | null
  canKick: boolean
  kickingPlayerId: PlayerId | null
}>()

const emit = defineEmits<{
  kick: [player: PublicPlayer]
}>()
</script>

<template>
  <div class="space-y-6">
    <section v-if="host">
      <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
        Maître du jeu
      </h2>
      <div class="mt-3 flex items-center justify-between rounded-2xl border border-lgu-orange/25 bg-lgu-orange/10 p-4">
        <div class="min-w-0">
          <p class="truncate font-bold text-white">{{ host.name }}</p>
          <p class="mt-1 text-xs text-lgu-orange">Narrateur</p>
        </div>
        <AppBadge :tone="host.connected ? 'success' : 'neutral'">
          {{ host.connected ? 'Connecté' : 'Déconnecté' }}
        </AppBadge>
      </div>
    </section>

    <section>
      <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
        Joueurs · {{ players.length }}
      </h2>
      <ul class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        <li
          v-for="player in players"
          :key="player.id"
          class="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <div class="min-w-0">
            <p class="truncate font-semibold text-white">
              {{ player.name }}
              <span v-if="player.id === currentPlayerId" class="text-sm text-slate-400">
                (vous)
              </span>
            </p>
            <p
              class="mt-1 text-xs"
              :class="player.connected ? 'text-emerald-300' : 'text-slate-400'"
            >
              {{ player.connected ? 'Connecté' : 'Déconnecté' }}
            </p>
          </div>
          <AppButton
            v-if="canKick && player.id !== currentPlayerId"
            variant="danger"
            size="sm"
            class="shrink-0"
            :disabled="kickingPlayerId === player.id"
            :loading="kickingPlayerId === player.id"
            @click="emit('kick', player)"
          >
            {{ kickingPlayerId === player.id ? 'Expulsion…' : 'Expulser' }}
          </AppButton>
        </li>
        <li
          v-if="players.length === 0"
          class="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400"
        >
          Aucun joueur pour le moment.
        </li>
      </ul>
    </section>
  </div>
</template>
