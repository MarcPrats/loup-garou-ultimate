<script setup lang="ts">
const modelValue = defineModel<string>({ required: true })

withDefaults(defineProps<{
  type?: 'text' | 'email' | 'password' | 'search' | 'url'
  disabled?: boolean
  readonly?: boolean
}>(), {
  type: 'text',
  disabled: false,
  readonly: false,
})
</script>

<template>
  <input
    v-model="modelValue"
    class="app-control app-input"
    :type="type"
    :disabled="disabled"
    :readonly="readonly"
  >
</template>
