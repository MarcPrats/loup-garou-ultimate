<script setup lang="ts">
import { computed } from 'vue'

import {
  CONNECTION_STATE,
  type ConnectionState,
} from '../constants/app'

const props = defineProps<{ state: ConnectionState }>()

const presentation = computed(() => {
  switch (props.state) {
    case CONNECTION_STATE.ONLINE:
      return { label: 'Connecté', color: 'bg-emerald-400', pulse: false }
    case CONNECTION_STATE.CONNECTING:
      return { label: 'Connexion…', color: 'bg-amber-400', pulse: true }
    case CONNECTION_STATE.RECONNECTING:
      return { label: 'Reconnexion…', color: 'bg-amber-400', pulse: true }
    case CONNECTION_STATE.ERROR:
      return { label: 'Serveur indisponible', color: 'bg-red-400', pulse: false }
    default:
      return { label: 'Déconnecté', color: 'bg-slate-400', pulse: false }
  }
})
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur"
  >
    <span
      class="h-2.5 w-2.5 rounded-full"
      :class="[presentation.color, { 'animate-pulse': presentation.pulse }]"
      aria-hidden="true"
    />
    {{ presentation.label }}
  </div>
</template>
