<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import ConnectionStatus from './components/ConnectionStatus.vue'
import NoticeToast from './components/NoticeToast.vue'
import { ROUTE_NAME } from './constants/app'
import { routeNameForDestination } from './router'
import { useLobbyStore } from './stores/lobby'

const lobby = useLobbyStore()
const route = useRoute()
const router = useRouter()

async function synchronizeRoute(): Promise<void> {
  if (!lobby.initialized) return
  if (!lobby.hasSession) {
    if (route.name !== ROUTE_NAME.HOME) {
      await router.replace({ name: ROUTE_NAME.HOME })
    }
    return
  }

  const destinationRouteName = routeNameForDestination(lobby.destination)
  if (route.name !== destinationRouteName) {
    await router.replace({ name: destinationRouteName })
  }
}

onMounted(() => {
  void lobby.initialize()
})

watch(
  () => [lobby.initialized, lobby.hasSession, lobby.destination, route.name],
  () => void synchronizeRoute(),
  { immediate: true },
)

onBeforeUnmount(() => lobby.dispose())
</script>

<template>
  <RouterView />
  <NoticeToast
    v-if="lobby.notice"
    :key="lobby.notice.id"
    :level="lobby.notice.level"
    :message="lobby.notice.message"
  />
  <ConnectionStatus :state="lobby.connectionState" />
</template>
