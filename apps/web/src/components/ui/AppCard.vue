<script setup lang="ts">
withDefaults(defineProps<{
  as?: string
  elevated?: boolean
}>(), {
  as: 'div',
  elevated: false,
})
</script>

<template>
  <component :is="as" class="app-card" :class="{ 'app-card-elevated': elevated }">
    <slot />
  </component>
</template>
