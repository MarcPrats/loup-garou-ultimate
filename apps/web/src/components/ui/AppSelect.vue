<script setup lang="ts">
const modelValue = defineModel<string>({ required: true })

withDefaults(defineProps<{
  disabled?: boolean
}>(), {
  disabled: false,
})
</script>

<template>
  <select v-model="modelValue" class="app-control app-select" :disabled="disabled">
    <slot />
  </select>
</template>
