<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useLobbyStore } from '../stores/lobby'
import HomeView from './HomeView.vue'
import LobbyView from './LobbyView.vue'

const route = useRoute()
const lobby = useLobbyStore()
const targetLobbyId = computed(() => (
  typeof route.params.lobbyId === 'string' && route.params.lobbyId.length > 0
    ? route.params.lobbyId
    : null
))
const hasLobbyId = computed(() => targetLobbyId.value !== null)
const belongsToAnotherLobby = computed(() => (
  hasLobbyId.value
  && lobby.hasSession
  && lobby.lobby?.id !== targetLobbyId.value
))
</script>

<template>
  <HomeView v-if="hasLobbyId && (!lobby.hasSession || belongsToAnotherLobby)" />
  <LobbyView v-else-if="lobby.hasSession" />
  <HomeView v-else />
</template>
