<script setup lang="ts">
import { NOTIFICATION_LEVEL, type NotificationLevel } from '@lgu/contracts'

defineProps<{
  level: NotificationLevel
  message: string
}>()
</script>

<template>
  <div
    :role="level === NOTIFICATION_LEVEL.ERROR ? 'alert' : 'status'"
    aria-live="polite"
    class="fixed left-1/2 top-4 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-2xl backdrop-blur sm:left-auto sm:right-4 sm:translate-x-0"
    :class="{
      'border-emerald-400/30 bg-emerald-950/95 text-emerald-100': level === NOTIFICATION_LEVEL.SUCCESS,
      'border-red-400/30 bg-red-950/95 text-red-100': level === NOTIFICATION_LEVEL.ERROR,
      'border-amber-400/30 bg-amber-950/95 text-amber-100': level === NOTIFICATION_LEVEL.WARNING,
      'border-sky-400/30 bg-sky-950/95 text-sky-100': level === NOTIFICATION_LEVEL.INFO,
    }"
  >
    {{ message }}
  </div>
</template>
