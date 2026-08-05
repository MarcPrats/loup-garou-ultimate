<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import RoleCard from '../components/RoleCard.vue'
import { ROUTE_NAME } from '../constants/app'
import { getRolePresentation } from '../constants/role-presentation'

const route = useRoute()
const roleId = computed(() => String(route.params.roleId ?? ''))
const presentation = computed(() => getRolePresentation(roleId.value))

onMounted(() => {
  document.title = presentation.value
    ? `${presentation.value.name} — Loup Garou Ultime`
    : 'Personnage inconnu — Loup Garou Ultime'
})

onBeforeUnmount(() => {
  document.title = 'Loup Garou Ultime'
})
</script>

<template>
  <main class="min-h-screen px-4 py-8 text-white sm:py-12">
    <div class="mx-auto w-full max-w-5xl">
      <nav class="mb-8 flex flex-wrap gap-3" aria-label="Navigation du personnage">
        <RouterLink
          :to="{ name: ROUTE_NAME.RULES }"
          class="rounded-xl border border-white/15 px-5 py-3 font-bold text-slate-200 hover:bg-white/10"
        >
          Retour aux règles
        </RouterLink>
        <RouterLink
          :to="{ name: ROUTE_NAME.HOME }"
          class="rounded-xl border border-white/15 px-5 py-3 font-bold text-slate-200 hover:bg-white/10"
        >
          Retour à l'accueil
        </RouterLink>
      </nav>

      <RoleCard v-if="presentation" :role-id="roleId" eyebrow="Fiche personnage" />
      <section v-else class="rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 class="font-display text-3xl font-bold">Personnage inconnu</h1>
        <p class="mt-3 text-slate-300">Le personnage demandé n'est pas disponible dans cette version.</p>
      </section>
    </div>
  </main>
</template>
