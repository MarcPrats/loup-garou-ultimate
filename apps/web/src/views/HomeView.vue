<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import {
  API_ROUTE,
  SOCKET_EVENT,
  healthResponseSchema,
  type SystemReadyEvent,
} from '@lgu/contracts'

import { getSocket } from '../services/socket'

const apiStatus = ref<'checking' | 'ready' | 'error'>('checking')
const socketStatus = ref<'connecting' | 'ready' | 'error'>('connecting')
const serverMessage = ref('Connexion au nouveau serveur…')

const socket = getSocket()

function handleSystemReady(event: SystemReadyEvent) {
  socketStatus.value = 'ready'
  serverMessage.value = event.message
}

function handleConnectError() {
  socketStatus.value = 'error'
  serverMessage.value = 'Le serveur temps réel est indisponible.'
}

onMounted(async () => {
  socket.on(SOCKET_EVENT.SYSTEM_READY, handleSystemReady)
  socket.on('connect_error', handleConnectError)
  socket.connect()

  try {
    const response = await fetch(API_ROUTE.HEALTH)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const health = healthResponseSchema.parse(await response.json())
    apiStatus.value = health.status === 'ok' ? 'ready' : 'error'
  } catch {
    apiStatus.value = 'error'
  }
})

onBeforeUnmount(() => {
  socket.off(SOCKET_EVENT.SYSTEM_READY, handleSystemReady)
  socket.off('connect_error', handleConnectError)
})
</script>

<template>
  <main class="min-h-screen bg-lgu-background px-4 py-12 text-white">
    <section class="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-lgu-surface p-8 shadow-2xl sm:p-12">
      <p class="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-lgu-orange">
        Fondation V3
      </p>

      <h1 class="font-display text-4xl font-bold sm:text-6xl">
        Loup Garou Ultimate
      </h1>

      <p class="mt-5 text-lg leading-8 text-slate-300">
        Vue, TypeScript, Tailwind et le nouveau serveur Node sont correctement initialisés.
      </p>

      <dl class="mt-10 grid gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-white/10 bg-black/20 p-5">
          <dt class="text-sm text-slate-400">API HTTP</dt>
          <dd class="mt-2 font-bold" :class="apiStatus === 'ready' ? 'text-green-400' : 'text-amber-400'">
            {{ apiStatus }}
          </dd>
        </div>

        <div class="rounded-2xl border border-white/10 bg-black/20 p-5">
          <dt class="text-sm text-slate-400">Socket.IO</dt>
          <dd class="mt-2 font-bold" :class="socketStatus === 'ready' ? 'text-green-400' : 'text-amber-400'">
            {{ socketStatus }}
          </dd>
        </div>
      </dl>

      <p class="mt-6 rounded-xl bg-white/5 p-4 text-sm text-slate-300">
        {{ serverMessage }}
      </p>
    </section>
  </main>
</template>
