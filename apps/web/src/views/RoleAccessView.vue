<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  ROLE_ACCESS_VIEW,
  type RoleAccessResponse,
} from '@lgu/contracts'

import FeedbackBanner from '../components/FeedbackBanner.vue'
import HostDashboardPanel from '../components/HostDashboardPanel.vue'
import PlayerAssignmentPanel from '../components/PlayerAssignmentPanel.vue'
import { fetchRoleAccess } from '../services/role-access'

const route = useRoute()
const response = ref<RoleAccessResponse | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
let controller: AbortController | null = null

const token = computed(() => {
  const value = route.hash.startsWith('#') ? route.hash.slice(1) : route.hash
  try {
    return decodeURIComponent(value)
  } catch {
    return ''
  }
})

async function load(): Promise<void> {
  controller?.abort()
  controller = null
  response.value = null
  errorMessage.value = null
  loading.value = false
  const requestedToken = token.value
  if (!requestedToken) {
    errorMessage.value = 'Ce lien privé ne contient aucun jeton d’accès.'
    return
  }

  const requestController = new AbortController()
  controller = requestController
  loading.value = true
  try {
    const result = await fetchRoleAccess(
      requestedToken,
      requestController.signal,
    )
    if (controller === requestController && token.value === requestedToken) {
      response.value = result
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    if (controller !== requestController || token.value !== requestedToken) return
    errorMessage.value = error instanceof Error && error.name === 'RoleAccessError'
      ? error.message
      : 'Impossible de charger cette vue privée. Vérifiez votre connexion.'
  } finally {
    if (controller === requestController) loading.value = false
  }
}

watch(token, () => void load(), { immediate: true })
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <main class="min-h-screen px-4 py-10 text-white sm:py-14">
    <div class="mx-auto w-full max-w-5xl">
      <div
        v-if="loading"
        role="status"
        class="rounded-3xl border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl"
      >
        <span class="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-lgu-orange" aria-hidden="true" />
        <p class="mt-5 font-semibold text-slate-300">Chargement de la vue privée…</p>
      </div>

      <section
        v-else-if="errorMessage"
        class="mx-auto max-w-xl rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl"
      >
        <p class="text-5xl" aria-hidden="true">🔒</p>
        <h1 class="mt-4 font-display text-3xl font-bold">Lien inaccessible</h1>
        <FeedbackBanner class="mt-5 text-left" :message="errorMessage" variant="error" />
        <button
          type="button"
          class="mt-6 rounded-xl bg-white/10 px-5 py-3 font-bold hover:bg-white/15"
          @click="load"
        >
          Réessayer
        </button>
      </section>

      <div v-else-if="response?.view === ROLE_ACCESS_VIEW.PLAYER">
        <div class="mb-5 flex justify-end">
          <button type="button" class="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15" @click="load">
            Actualiser
          </button>
        </div>
        <PlayerAssignmentPanel
          :assignment="response.assignment"
          :show-access-link="false"
        />
      </div>

      <div v-else-if="response?.view === ROLE_ACCESS_VIEW.GAME_MASTER">
        <div class="mb-5 flex justify-end">
          <button type="button" class="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15" @click="load">
            Actualiser
          </button>
        </div>
        <HostDashboardPanel
          :dashboard="response.dashboard"
          :show-access-link="false"
        />
      </div>
    </div>
  </main>
</template>
