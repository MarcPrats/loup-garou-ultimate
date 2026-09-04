<script setup lang="ts">
import { nextTick, ref } from 'vue'

import type { PrivateAssignment } from '@lgu/contracts'

import RoleInfoPanel from './RoleInfoPanel.vue'

defineProps<{
  assignment: PrivateAssignment
}>()

const emit = defineEmits<{
  continue: []
}>()

const revealed = ref(false)
const canContinue = ref(false)

function handleRevealed(): void {
  revealed.value = true
  void nextTick(() => {
    canContinue.value = true
  })
}

function continueToPlayerView(): void {
  if (!canContinue.value) return
  emit('continue')
}
</script>

<template>
  <section
    class="app-role-reveal-page"
    :class="{ 'app-role-reveal-page-ready': canContinue }"
    data-testid="role-reveal-page"
    :data-state="revealed ? 'revealed' : 'hidden'"
    aria-labelledby="role-reveal-page-title"
    :tabindex="canContinue ? 0 : -1"
    @click="continueToPlayerView"
    @keydown.enter.prevent="continueToPlayerView"
    @keydown.space.prevent="continueToPlayerView"
  >
    <div class="app-role-reveal-stage">
      <h1 id="role-reveal-page-title">Révéler votre rôle</h1>

      <RoleInfoPanel
        :role-id="assignment.role.id"
        power-title="Votre Pouvoir"
        info-title="Autres Infos"
        compact
        revealable
        @revealed="handleRevealed"
      />
    </div>
  </section>
</template>
