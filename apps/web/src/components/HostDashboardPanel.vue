<script setup lang="ts">
import { computed, ref } from 'vue'

import type { HostDashboard } from '@lgu/contracts'

import { getRolePresentation } from '../constants/role-presentation'
import HostAssignmentCard from './HostAssignmentCard.vue'
import RoleAccessLink from './RoleAccessLink.vue'

const props = withDefaults(defineProps<{
  dashboard: HostDashboard
  showAccessLink?: boolean
}>(), {
  showAccessLink: true,
})

const emit = defineEmits<{ copied: [] }>()
const query = ref('')

const connectedCount = computed(() => (
  props.dashboard.players.filter((entry) => entry.player.connected).length
))
const filteredAssignments = computed(() => {
  const normalized = query.value.trim().toLocaleLowerCase('fr')
  if (!normalized) return props.dashboard.players
  return props.dashboard.players.filter((entry) => {
    const roleName = getRolePresentation(entry.role.id)?.name ?? entry.role.id
    const bluffName = entry.bluffRoleId
      ? getRolePresentation(entry.bluffRoleId)?.name ?? entry.bluffRoleId
      : ''
    return [entry.player.name, roleName, bluffName]
      .some((value) => value.toLocaleLowerCase('fr').includes(normalized))
  })
})
</script>

<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-bold uppercase tracking-[0.22em] text-lgu-orange">
        Tableau privé du maître du jeu
      </p>
      <h1 class="mt-2 font-display text-4xl font-bold text-white sm:text-6xl">
        Attributions de la partie
      </h1>
      <p class="mt-4 max-w-3xl leading-7 text-slate-300">
        Cette vue contient toutes les informations secrètes. Ne la montrez jamais aux joueurs.
      </p>
    </header>

    <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p class="text-sm text-slate-400">Joueurs</p>
        <p class="mt-1 font-display text-3xl font-bold text-white">{{ dashboard.playerCount }}</p>
      </div>
      <div class="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
        <p class="text-sm text-emerald-200/75">Camp du village</p>
        <p class="mt-1 font-display text-3xl font-bold text-emerald-100">{{ dashboard.villagerTeamCount }}</p>
      </div>
      <div class="rounded-2xl border border-purple-400/20 bg-purple-400/10 p-5">
        <p class="text-sm text-purple-200/75">Loups-garous</p>
        <p class="mt-1 font-display text-3xl font-bold text-purple-100">{{ dashboard.werewolfCount }}</p>
      </div>
      <div class="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-5">
        <p class="text-sm text-sky-200/75">Connectés</p>
        <p class="mt-1 font-display text-3xl font-bold text-sky-100">{{ connectedCount }}</p>
      </div>
    </section>

    <RoleAccessLink
      v-if="showAccessLink"
      :token="dashboard.roleAccessToken"
      @copied="emit('copied')"
    />

    <section class="rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-7">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="font-display text-3xl font-bold text-white">Joueurs et rôles</h2>
          <p class="mt-2 text-sm text-slate-400">
            Ouvrez une fiche pour consulter tous ses secrets.
          </p>
        </div>
        <div class="sm:w-72">
          <label for="assignment-search" class="text-sm font-bold text-slate-300">
            Rechercher
          </label>
          <input
            id="assignment-search"
            v-model="query"
            type="search"
            placeholder="Joueur ou rôle"
            class="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-slate-500"
          >
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <HostAssignmentCard
          v-for="assignment in filteredAssignments"
          :key="assignment.player.id"
          :assignment="assignment"
        />
        <p
          v-if="filteredAssignments.length === 0"
          class="rounded-2xl border border-dashed border-white/15 p-6 text-center text-slate-400"
        >
          Aucun joueur ne correspond à cette recherche.
        </p>
      </div>
    </section>
  </div>
</template>
