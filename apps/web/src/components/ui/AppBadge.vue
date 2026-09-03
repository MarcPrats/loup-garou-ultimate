<script setup lang="ts">
withDefaults(defineProps<{
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'special'
}>(), {
  tone: 'neutral',
})
</script>

<template>
  <span class="app-badge" :class="`app-badge-${tone}`">
    <slot />
  </span>
</template>
