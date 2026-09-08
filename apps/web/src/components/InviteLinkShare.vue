<script setup lang="ts">
import { computed, ref } from 'vue'

import AppButton from './ui/AppButton.vue'
import AppInput from './ui/AppInput.vue'
import { appPath } from '../constants/paths'
import { useLobbyStore } from '../stores/lobby'

const lobby = useLobbyStore()
const copying = ref(false)
const copyError = ref(false)
const inviteUrl = computed(() => {
  if (typeof window === 'undefined' || !lobby.lobby?.id) return ''
  return `${window.location.origin}${appPath(`/lobby/${lobby.lobby.id}`)}`
})

async function copyInvite(): Promise<void> {
  copying.value = true
  copyError.value = false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteUrl.value)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = inviteUrl.value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.append(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      textarea.remove()
      if (!copied) throw new Error('Copy command failed')
    }
    lobby.showCopiedNotice()
  } catch {
    copyError.value = true
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <div class="app-invitation-container">
    <p class="app-invitation-label">🔗 Lien d'invitation</p>
    <div class="app-invitation-group">
      <AppInput :display-value="inviteUrl" readonly class="app-invitation-link" aria-label="Lien d'invitation" />
      <AppButton size="sm" class="app-copy-button" :disabled="copying" @click="copyInvite">
        📋 {{ copying ? 'Copie…' : 'Copier' }}
      </AppButton>
    </div>
    <p v-if="copyError" class="app-copy-error" role="alert">Copie impossible. Sélectionnez le lien et copiez-le manuellement.</p>
  </div>
</template>
