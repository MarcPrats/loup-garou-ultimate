<script setup lang="ts">
import type { PrivateAssignment } from '@lgu/contracts'

import RoleAccessLink from './RoleAccessLink.vue'
import RoleCard from './RoleCard.vue'
import SpecialInformationCard from './SpecialInformationCard.vue'

withDefaults(defineProps<{
  assignment: PrivateAssignment
  showAccessLink?: boolean
}>(), {
  showAccessLink: true,
})

const emit = defineEmits<{ copied: [] }>()
</script>

<template>
  <div class="space-y-6">
    <header class="text-center">
      <p class="text-sm font-bold uppercase tracking-[0.22em] text-lgu-orange">
        Attribution privée de {{ assignment.player.name }}
      </p>
      <h1 class="mt-2 font-display text-4xl font-bold text-white sm:text-6xl">
        Votre rôle
      </h1>
      <p class="mt-4 text-slate-300">
        Gardez cet écran à l’abri des regards des autres joueurs.
      </p>
    </header>

    <RoleCard
      :role-id="assignment.role.id"
      eyebrow="Rôle qui vous est attribué"
    />

    <section
      v-if="assignment.bluffRoleId"
      class="space-y-5 rounded-[2rem] border border-amber-400/30 bg-amber-400/10 p-5 sm:p-7"
    >
      <div>
        <p class="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
          Couverture secrète
        </p>
        <h2 class="mt-2 font-display text-3xl font-bold text-white">
          Le rôle que vous devez prétendre avoir
        </h2>
        <p class="mt-3 leading-7 text-amber-100/85">
          Utilisez cette identité pour dissimuler votre appartenance à la meute pendant les débats.
        </p>
      </div>
      <RoleCard
        :role-id="assignment.bluffRoleId"
        eyebrow="Votre couverture"
        compact
      />
    </section>

    <SpecialInformationCard
      v-if="assignment.specialInformation"
      :information="assignment.specialInformation"
      :cover-information="assignment.bluffRoleId !== null"
    />

    <RoleAccessLink
      v-if="showAccessLink"
      :token="assignment.roleAccessToken"
      @copied="emit('copied')"
    />
  </div>
</template>
