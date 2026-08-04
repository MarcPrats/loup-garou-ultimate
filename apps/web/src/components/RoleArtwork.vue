<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  src: string
  alt: string
  fallbackSymbol: string
}>()

const failed = ref(false)
watch(() => props.src, () => {
  failed.value = false
})
</script>

<template>
  <div class="grid aspect-[4/5] place-items-center overflow-hidden rounded-2xl bg-black/25">
    <img
      v-if="!failed"
      :src="src"
      :alt="alt"
      class="h-full w-full object-cover"
      @error="failed = true"
    >
    <span v-else class="text-7xl" role="img" :aria-label="alt">
      {{ fallbackSymbol }}
    </span>
  </div>
</template>
