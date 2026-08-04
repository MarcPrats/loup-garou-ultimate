<script setup lang="ts">
import { computed } from 'vue'

import InviteLink from './InviteLink.vue'

const props = defineProps<{
  token: string
}>()
const emit = defineEmits<{ copied: [] }>()

const accessUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/access#${encodeURIComponent(props.token)}`
})
</script>

<template>
  <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
    <InviteLink
      :value="accessUrl"
      label="Lien privé vers cette vue"
      @copied="emit('copied')"
    />
    <p class="mt-3 text-xs leading-5 text-slate-400">
      Toute personne possédant ce lien peut consulter cette vue. Ne le partagez pas publiquement.
    </p>
  </section>
</template>
