<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'

import { SESSION_DESTINATION } from '@lgu/contracts'
import { RouterView, useRoute, useRouter } from 'vue-router'

import ConnectionStatus from './components/ConnectionStatus.vue'
import NoticeToast from './components/NoticeToast.vue'
import { CONNECTION_STATE, ROUTE_NAME } from './constants/app'
import { routeNameForDestination } from './router'
import { useLobbyStore } from './stores/lobby'

const route = useRoute()
const staticMode = import.meta.env.VITE_STATIC_MODE === 'true'
const router = useRouter()
const lobby = shallowRef<ReturnType<typeof useLobbyStore> | null>(null)
const connectionState = computed(() => (
  lobby.value?.connectionState ?? CONNECTION_STATE.OFFLINE
))

function requireLobbyStore(): ReturnType<typeof useLobbyStore> {
  lobby.value ??= useLobbyStore()
  return lobby.value
}

async function synchronizeRoute(): Promise<void> {
  if (staticMode || route.meta.roleAccess || route.meta.simulator) return
  const store = lobby.value
  if (!store?.initialized) return
  if (!store.hasSession) {
    if (route.meta.public) return
    if (route.name !== ROUTE_NAME.HOME && route.name !== ROUTE_NAME.LOBBIES && !(route.name === ROUTE_NAME.LOBBY && route.params.lobbyId)) {
      await router.replace({ name: ROUTE_NAME.HOME })
    }
    return
  }

  if (route.meta.public && store.destination === SESSION_DESTINATION.LOBBY) return

  const destinationRouteName = routeNameForDestination(store.destination)
  if (route.name !== destinationRouteName) {
    await router.replace({ name: destinationRouteName })
  }
}

watch(
  () => route.meta.simulator,
  (simulator) => {
    if (staticMode || simulator) {
      lobby.value?.suspendRealtime()
    } else {
      void requireLobbyStore().resumeRealtime()
    }
  },
  { immediate: true },
)

watch(
  () => [
    lobby.value?.initialized,
    lobby.value?.hasSession,
    lobby.value?.destination,
    route.name,
  ],
  () => void synchronizeRoute(),
  { immediate: true },
)

onBeforeUnmount(() => lobby.value?.dispose())
</script>

<template>
  <RouterView />
  <NoticeToast
    v-if="!staticMode && lobby?.notice && !route.meta.simulator"
    :key="lobby.notice.id"
    :level="lobby.notice.level"
    :message="lobby.notice.message"
  />
  <ConnectionStatus
    v-if="!staticMode && !route.meta.simulator"
    :state="connectionState"
  />
</template>
