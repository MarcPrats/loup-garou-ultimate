<script setup lang="ts">
import { ref } from 'vue'

import type { RoleId } from '@lgu/contracts'

import {
  ROLE_CATEGORY_LABEL,
  getRolePresentation,
} from '../constants/role-presentation'

const props = withDefaults(defineProps<{
  roleId: RoleId
  title?: string
  powerTitle: string
  infoTitle: string
  compact?: boolean
  revealable?: boolean
}>(), {
  compact: false,
  revealable: false,
})
const role = getRolePresentation(props.roleId)
const revealed = ref(!props.revealable)

const emit = defineEmits<{
  revealed: []
}>()

function reveal(): void {
  if (revealed.value) return
  revealed.value = true
  emit('revealed')
}
</script>

<template>
  <div v-if="role" class="app-role-description-container app-bluff-section" :class="{ 'app-role-info-compact': compact }">
    <h3 v-if="title" class="app-bluff-title">{{ title }}</h3>
    <div
      v-if="revealable"
      class="app-role-flip-shell"
      :class="{ 'app-role-flip-shell-revealed': revealed }"
    >
      <div class="app-role-flip-inner" :class="{ 'app-role-flip-inner-revealed': revealed }">
        <button
          v-if="!revealed"
          type="button"
          class="app-role-card app-role-card-face app-role-card-back"
          data-testid="role-reveal-card"
          aria-label="Révéler votre rôle"
          @click="reveal"
        >
          <span class="app-role-card-back-symbols" aria-hidden="true">✦ ✧ 🐺 ✧ ✦</span>
          <span class="app-role-card-back-lock" aria-hidden="true">?</span>
          <strong>Votre rôle est prêt</strong>
          <span class="app-role-card-back-hint">Touchez la carte pour le révéler</span>
          <span class="app-role-card-back-sparkle-line" aria-hidden="true">✦ · ✧ · ✦</span>
        </button>
        <div class="app-role-card app-role-card-face app-role-card-front" :aria-hidden="!revealed">
          <div class="app-role-image-container">
            <img :src="role.imagePath" :alt="role.name">
          </div>
          <div class="app-role-info">
            <h4>{{ role.name }}</h4>
            <p class="app-role-category">{{ ROLE_CATEGORY_LABEL[role.category] }}</p>
          </div>
        </div>
      </div>
      <div class="app-role-sparkles" aria-hidden="true">
        <span class="app-role-sparkle app-role-sparkle-1">✦</span>
        <span class="app-role-sparkle app-role-sparkle-2">✧</span>
        <span class="app-role-sparkle app-role-sparkle-3">✦</span>
        <span class="app-role-sparkle app-role-sparkle-4">·</span>
        <span class="app-role-sparkle app-role-sparkle-5">✧</span>
      </div>
    </div>

    <div v-else class="app-role-card">
      <div class="app-role-image-container">
        <img :src="role.imagePath" :alt="role.name">
      </div>
      <div class="app-role-info">
        <h4>{{ role.name }}</h4>
        <p class="app-role-category">{{ ROLE_CATEGORY_LABEL[role.category] }}</p>
      </div>
    </div>

    <template v-if="!compact && (!revealable || revealed)">
      <section class="app-description-section app-power-section">
        <div class="app-section-header"><span class="app-section-icon">⚡</span><h4>{{ powerTitle }}</h4></div>
        <p class="app-section-text">{{ role.power }}</p>
      </section>
      <section class="app-description-section app-info-section">
        <div class="app-section-header"><span class="app-section-icon">💡</span><h4>{{ infoTitle }}</h4></div>
        <p class="app-section-text">{{ role.info }}</p>
      </section>
    </template>
  </div>
</template>
