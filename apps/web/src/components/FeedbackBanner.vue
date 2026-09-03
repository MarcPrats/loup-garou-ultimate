<script setup lang="ts">
import AppAlert from './ui/AppAlert.vue'

defineProps<{
  message: string
  variant?: 'error' | 'info' | 'warning'
}>()
</script>

<template>
  <AppAlert :variant="variant">
    {{ message }}
  </AppAlert>
</template>
