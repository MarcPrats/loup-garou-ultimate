<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useLobbyStore } from '../stores/lobby'
import HomeView from './HomeView.vue'
import LobbyView from './LobbyView.vue'

const route = useRoute()
const lobby = useLobbyStore()
const hasLobbyId = computed(() => typeof route.params.lobbyId === 'string' && route.params.lobbyId.length > 0)
</script>

<template>
  <HomeView v-if="hasLobbyId && !lobby.hasSession" />
  <LobbyView v-else-if="lobby.hasSession" />
  <HomeView v-else />
</template>
