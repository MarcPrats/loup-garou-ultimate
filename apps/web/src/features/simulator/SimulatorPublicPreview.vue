<script setup lang="ts">
import type { RoomSnapshot } from '@lgu/contracts'

defineProps<{ room: RoomSnapshot }>()
</script>

<template>
  <section class="rounded-3xl border border-white/10 bg-slate-900/75 p-6 sm:p-8">
    <p class="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
      Aperçu public
    </p>
    <h2 class="mt-2 font-display text-3xl font-bold text-white">
      Salle visible par tous
    </h2>
    <p class="mt-3 text-sm leading-6 text-slate-400">
      Cette projection ne contient aucun rôle, bluff, indice, jeton privé ou modificateur caché.
    </p>
    <ul class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="player in room.players"
        :key="player.id"
        class="rounded-2xl border border-white/10 bg-white/5 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate font-bold text-white">{{ player.name }}</p>
            <p class="mt-1 text-xs text-slate-400">
              {{ player.isHost ? 'Maître du jeu' : 'Joueur' }}
            </p>
          </div>
          <span class="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-label="Connecté" />
        </div>
      </li>
    </ul>
  </section>
</template>
