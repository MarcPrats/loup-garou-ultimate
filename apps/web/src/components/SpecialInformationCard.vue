<script setup lang="ts">
import { computed } from 'vue'

import {
  SPECIAL_INFORMATION_TYPE,
  type SpecialInformation,
} from '@lgu/contracts'

import { getRolePresentation } from '../constants/role-presentation'

const props = defineProps<{
  information: SpecialInformation
  coverInformation?: boolean
}>()

const roleName = computed(() => (
  getRolePresentation(props.information.roleId)?.name
    ?? props.information.roleId
))
const title = computed(() => (
  props.information.type === SPECIAL_INFORMATION_TYPE.RENARD
    ? 'Indice du Renard'
    : 'Indice de la Petite Fille'
))
</script>

<template>
  <section class="rounded-3xl border border-sky-400/30 bg-sky-400/10 p-6 text-sky-50">
    <p class="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
      {{ coverInformation ? 'Information de couverture' : 'Information privée' }}
    </p>
    <h3 class="mt-2 font-display text-2xl font-bold">{{ title }}</h3>
    <p class="mt-3 leading-7 text-sky-100/90">
      Parmi les deux joueurs suivants, l’un possède le rôle
      <strong>{{ roleName }}</strong>.
    </p>
    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      <div
        v-for="player in information.players"
        :key="player.id"
        class="rounded-2xl border border-sky-300/20 bg-black/20 p-4 text-center font-bold"
      >
        {{ player.name }}
      </div>
    </div>
  </section>
</template>
