<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import ConnectionStatus from './components/ConnectionStatus.vue'
import NoticeToast from './components/NoticeToast.vue'
import { CONNECTION_STATE, ROUTE_NAME } from './constants/app'
import { routeNameForDestination } from './router'
import { useLobbyStore } from './stores/lobby'

const route = useRoute()
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
  if (route.meta.roleAccess || route.meta.simulator || route.meta.public) return
  const store = lobby.value
  if (!store?.initialized) return
  if (!store.hasSession) {
    if (route.name !== ROUTE_NAME.HOME && route.name !== ROUTE_NAME.ENTRY) {
      await router.replace({ name: ROUTE_NAME.HOME })
    }
    return
  }

  const destinationRouteName = routeNameForDestination(store.destination)
  if (route.name !== destinationRouteName) {
    await router.replace({ name: destinationRouteName })
  }
}

watch(
  () => route.meta.simulator,
  (simulator) => {
    if (simulator) {
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
    v-if="lobby?.notice && !route.meta.simulator"
    :key="lobby.notice.id"
    :level="lobby.notice.level"
    :message="lobby.notice.message"
  />
  <ConnectionStatus
    v-if="!route.meta.simulator"
    :state="connectionState"
  />
</template>
