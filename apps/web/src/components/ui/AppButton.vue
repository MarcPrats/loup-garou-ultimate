<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  block?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'secondary',
  size: 'md',
  loading: false,
  disabled: false,
  block: false,
  type: 'button',
})
</script>

<template>
  <button
    :type="type"
    class="app-button app-btn"
    :class="[
      `app-button-${variant} app-btn-${variant}`,
      `app-button-${size}`,
      { 'app-button-block': block },
    ]"
    :disabled="props.disabled || props.loading"
    :aria-busy="props.loading || undefined"
  >
    <span v-if="loading" class="app-button-spinner" aria-hidden="true" />
    <slot />
  </button>
</template>
