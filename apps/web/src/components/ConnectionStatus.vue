<script setup lang="ts">
import { computed } from 'vue'

import {
  CONNECTION_STATE,
  type ConnectionState,
} from '../constants/app'
import AppBadge from './ui/AppBadge.vue'

const props = defineProps<{ state: ConnectionState }>()

const presentation = computed(() => {
  switch (props.state) {
    case CONNECTION_STATE.ONLINE:
      return { label: 'Connecté', tone: 'success' as const, pulse: false }
    case CONNECTION_STATE.CONNECTING:
      return { label: 'Connexion…', tone: 'warning' as const, pulse: true }
    case CONNECTION_STATE.RECONNECTING:
      return { label: 'Reconnexion…', tone: 'warning' as const, pulse: true }
    case CONNECTION_STATE.ERROR:
      return { label: 'Serveur indisponible', tone: 'danger' as const, pulse: false }
    default:
      return { label: 'Déconnecté', tone: 'neutral' as const, pulse: false }
  }
})
</script>

<template>
  <AppBadge
    :tone="presentation.tone"
    class="fixed bottom-4 right-4 z-40 border-white/10 bg-slate-950/90 text-sm shadow-xl backdrop-blur"
  >
    <span
      class="app-status-dot"
      :class="{ 'app-status-dot-pulse': presentation.pulse }"
      aria-hidden="true"
    />
    {{ presentation.label }}
  </AppBadge>
</template>
