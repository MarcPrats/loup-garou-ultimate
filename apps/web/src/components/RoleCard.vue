<script setup lang="ts">
import { computed } from 'vue'

import { ROLE_CATEGORY } from '@lgu/contracts'

import {
  ROLE_CATEGORY_LABEL,
  getRolePresentation,
} from '../constants/role-presentation'
import RoleArtwork from './RoleArtwork.vue'

const props = withDefaults(defineProps<{
  roleId: string
  eyebrow?: string
  compact?: boolean
}>(), {
  eyebrow: 'Votre rôle',
  compact: false,
})

const presentation = computed(() => getRolePresentation(props.roleId))
const categoryClass = computed(() => {
  switch (presentation.value?.category) {
    case ROLE_CATEGORY.WEREWOLF:
      return 'border-lgu-werewolf/40 bg-lgu-werewolf/10 text-purple-100'
    case ROLE_CATEGORY.ULTIMATE_WEREWOLF:
      return 'border-lgu-ultimate/50 bg-lgu-ultimate/10 text-red-100'
    case ROLE_CATEGORY.OUTSIDER:
      return 'border-lgu-outsider/40 bg-lgu-outsider/10 text-blue-100'
    default:
      return 'border-lgu-villager/40 bg-lgu-villager/10 text-emerald-100'
  }
})
</script>

<template>
  <article
    v-if="presentation"
    class="overflow-hidden rounded-3xl border shadow-xl"
    :class="categoryClass"
  >
    <div :class="compact ? 'grid gap-5 p-5 sm:grid-cols-[8rem_1fr]' : 'grid gap-7 p-6 sm:grid-cols-[13rem_1fr] sm:p-8'">
      <RoleArtwork
        :src="presentation.imagePath"
        :alt="`Illustration du rôle ${presentation.name}`"
        :fallback-symbol="presentation.fallbackSymbol"
      />
      <div class="self-center">
        <p class="text-xs font-black uppercase tracking-[0.22em] opacity-75">
          {{ eyebrow }}
        </p>
        <h2 :class="compact ? 'mt-2 font-display text-2xl font-bold text-white' : 'mt-3 font-display text-4xl font-bold text-white sm:text-5xl'">
          {{ presentation.name }}
        </h2>
        <p class="mt-2 text-sm font-semibold opacity-80">
          {{ ROLE_CATEGORY_LABEL[presentation.category] }}
        </p>
        <p class="mt-4 leading-7 text-slate-100/90">
          {{ presentation.summary }}
        </p>
        <ul v-if="!compact" class="mt-5 space-y-2 text-sm leading-6 text-slate-200/90">
          <li
            v-for="instruction in presentation.instructions"
            :key="instruction"
            class="flex gap-3"
          >
            <span aria-hidden="true">•</span>
            <span>{{ instruction }}</span>
          </li>
        </ul>
      </div>
    </div>
  </article>

  <article v-else class="rounded-3xl border border-white/10 bg-white/5 p-6">
    <p class="text-sm font-bold uppercase tracking-wider text-slate-400">Rôle inconnu</p>
    <p class="mt-2 font-mono text-white">{{ roleId }}</p>
  </article>
</template>
