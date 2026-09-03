<script setup lang="ts">
import AppAlert from './ui/AppAlert.vue'

const props = withDefaults(defineProps<{
  message: string
  variant?: 'error' | 'info' | 'warning'
}>(), {
  variant: 'info',
})
</script>

<template>
  <AppAlert :variant="props.variant">
    {{ message }}
  </AppAlert>
</template>
