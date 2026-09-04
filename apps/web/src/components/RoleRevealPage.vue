<script setup lang="ts">
import { ref } from 'vue'

import type { PrivateAssignment } from '@lgu/contracts'

import RoleInfoPanel from './RoleInfoPanel.vue'
import { AppButton } from './ui'

defineProps<{
  assignment: PrivateAssignment
}>()

const emit = defineEmits<{
  continue: []
}>()

const revealed = ref(false)

function handleRevealed(): void {
  revealed.value = true
}
</script>

<template>
  <section class="app-role-reveal-page" data-testid="role-reveal-page" aria-labelledby="role-reveal-page-title">
    <div class="app-role-reveal-stage">
      <p class="app-role-reveal-eyebrow">🐺 Loup Garou Ultime</p>
      <p class="app-role-reveal-player">{{ assignment.player.name }}, votre carte est prête</p>
      <h1 id="role-reveal-page-title">Une carte vous attend</h1>
      <p class="app-role-reveal-intro">
        Prenez un instant pour découvrir votre rôle secret.
      </p>

      <RoleInfoPanel
        :role-id="assignment.role.id"
        title="🎭 Votre rôle"
        power-title="Votre Pouvoir"
        info-title="Autres Infos"
        compact
        revealable
        @revealed="handleRevealed"
      />

      <Transition name="role-reveal-continue">
        <div v-if="revealed" class="app-role-reveal-continue">
          <p role="status">Votre rôle est révélé. Gardez-le secret.</p>
          <AppButton
            variant="primary"
            size="lg"
            data-testid="continue-to-player-view"
            @click="emit('continue')"
          >
            Accéder à ma vue joueur
          </AppButton>
        </div>
      </Transition>

      <p v-if="!revealed" class="app-role-reveal-privacy">
        🔒 Cette carte n’est visible que par vous.
      </p>
    </div>
  </section>
</template>