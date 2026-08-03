<script setup lang="ts">
defineProps<{
  message: string
  variant?: 'error' | 'info' | 'warning'
}>()
</script>

<template>
  <div
    :role="variant === 'error' ? 'alert' : 'status'"
    class="rounded-2xl border px-4 py-3 text-sm leading-6"
    :class="{
      'border-red-400/30 bg-red-400/10 text-red-100': variant === 'error',
      'border-amber-400/30 bg-amber-400/10 text-amber-100': variant === 'warning',
      'border-sky-400/30 bg-sky-400/10 text-sky-100': !variant || variant === 'info',
    }"
  >
    {{ message }}
  </div>
</template>
