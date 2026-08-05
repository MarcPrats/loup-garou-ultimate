<script setup lang="ts">
import { computed } from 'vue'

import type { HostPlayerAssignment } from '@lgu/contracts'

import {
  IVROGNE_PRESENTATION,
  getRolePresentation,
} from '../constants/role-presentation'
import RoleArtwork from './RoleArtwork.vue'
import RoleInfoPanel from './RoleInfoPanel.vue'
import SpecialInformationCard from './SpecialInformationCard.vue'

const props = defineProps<{
  assignment: HostPlayerAssignment
}>()

const roleName = computed(() => (
  getRolePresentation(props.assignment.role.id)?.name
    ?? props.assignment.role.id
))
const bluffName = computed(() => (
  props.assignment.bluffRoleId
    ? getRolePresentation(props.assignment.bluffRoleId)?.name
      ?? props.assignment.bluffRoleId
    : null
))
</script>

<template>
  <details class="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 open:bg-white/[0.07]">
    <summary class="flex cursor-pointer list-none items-center justify-between gap-4 p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lgu-orange">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="truncate font-display text-xl font-bold text-white">
            {{ assignment.player.name }}
          </h3>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-bold"
            :class="assignment.player.connected ? 'bg-emerald-400/15 text-emerald-300' : 'bg-slate-400/15 text-slate-300'"
          >
            {{ assignment.player.connected ? 'Connecté' : 'Déconnecté' }}
          </span>
        </div>
        <p class="mt-2 text-sm text-slate-300">
          <template v-if="assignment.isDrunk">
            Ivrogne, rôle montré : {{ roleName }}
          </template>
          <template v-else>
            {{ roleName }}
          </template>
          <template v-if="bluffName">
            · couverture : {{ bluffName }}
          </template>
        </p>
      </div>
      <span class="text-2xl text-slate-400 transition group-open:rotate-180" aria-hidden="true">⌄</span>
    </summary>

    <div class="space-y-5 border-t border-white/10 p-5 sm:p-6">
      <div class="flex flex-wrap gap-2">
        <span
          v-if="assignment.isDrunk"
          class="rounded-full bg-amber-400/15 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-200"
        >
          Ivrogne caché
        </span>
        <span
          v-if="assignment.isVoyanteDecoy"
          class="rounded-full bg-fuchsia-400/15 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-fuchsia-200"
        >
          Leurre de la Voyante
        </span>
      </div>

      <section
        v-if="assignment.isDrunk"
        class="grid gap-5 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 sm:grid-cols-[8rem_1fr]"
      >
        <RoleArtwork
          :src="IVROGNE_PRESENTATION.imagePath"
          :alt="`Illustration du rôle ${IVROGNE_PRESENTATION.name}`"
          :fallback-symbol="IVROGNE_PRESENTATION.fallbackSymbol"
        />
        <div class="self-center">
          <p class="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
            Véritable statut secret
          </p>
          <h4 class="mt-2 font-display text-3xl font-bold text-white">
            {{ IVROGNE_PRESENTATION.name }}
          </h4>
          <p class="mt-3 leading-7 text-amber-100/85">
            {{ IVROGNE_PRESENTATION.summary }}
          </p>
        </div>
      </section>

      <RoleInfoPanel
        :role-id="assignment.role.id"
        :title="assignment.isDrunk ? 'Rôle montré au joueur' : 'Rôle véritable'"
        power-title="Pouvoir"
        info-title="Infos"
        compact
      />

      <RoleInfoPanel
        v-if="assignment.bluffRoleId"
        :role-id="assignment.bluffRoleId"
        title="Couverture du loup-garou"
        power-title="Pouvoir"
        info-title="Infos"
        compact
      />

      <SpecialInformationCard
        v-if="assignment.specialInformation"
        :information="assignment.specialInformation"
        :cover-information="assignment.bluffRoleId !== null"
      />
    </div>
  </details>
</template>
