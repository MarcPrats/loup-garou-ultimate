<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'error' | 'info' | 'warning' | 'success'
  live?: 'polite' | 'assertive'
}>(), {
  variant: 'info',
  live: 'polite',
})
</script>

<template>
  <div
    class="app-alert"
    :class="`app-alert-${variant}`"
    :role="variant === 'error' ? 'alert' : 'status'"
    :aria-live="live"
  >
    <span class="app-alert-icon" aria-hidden="true">
      {{ variant === 'error' ? '!' : variant === 'success' ? '✓' : variant === 'warning' ? '!' : 'i' }}
    </span>
    <span class="app-alert-content"><slot /></span>
  </div>
</template>
