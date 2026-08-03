<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ value: string }>()
const emit = defineEmits<{ copied: [] }>()
const copying = ref(false)
const copyError = ref(false)

async function copyLink(): Promise<void> {
  copying.value = true
  copyError.value = false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.value)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = props.value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.append(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      textarea.remove()
      if (!copied) throw new Error('Copy command failed')
    }
    emit('copied')
  } catch {
    copyError.value = true
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <div>
    <label for="invitation-link" class="text-sm font-semibold text-slate-300">
      Lien d’invitation
    </label>
    <div class="mt-2 flex flex-col gap-2 sm:flex-row">
      <input
        id="invitation-link"
        :value="value"
        readonly
        class="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-300"
      >
      <button
        type="button"
        class="rounded-xl bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/15 disabled:opacity-60"
        :disabled="copying"
        @click="copyLink"
      >
        {{ copying ? 'Copie…' : 'Copier' }}
      </button>
    </div>
    <p v-if="copyError" role="alert" class="mt-2 text-sm text-red-200">
      Copie impossible. Sélectionnez le lien et copiez-le manuellement.
    </p>
  </div>
</template>
