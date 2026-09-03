<script setup lang="ts">
import { NOTIFICATION_LEVEL, type NotificationLevel } from '@lgu/contracts'

import AppAlert from './ui/AppAlert.vue'

defineProps<{
  level: NotificationLevel
  message: string
}>()
</script>

<template>
  <AppAlert
    :variant="level === NOTIFICATION_LEVEL.ERROR ? 'error' : level === NOTIFICATION_LEVEL.SUCCESS ? 'success' : level === NOTIFICATION_LEVEL.WARNING ? 'warning' : 'info'"
    class="fixed left-1/2 top-4 z-50 w-[min(92vw,28rem)] -translate-x-1/2 font-semibold shadow-2xl backdrop-blur sm:left-auto sm:right-4 sm:translate-x-0"
  >
    {{ message }}
  </AppAlert>
</template>
