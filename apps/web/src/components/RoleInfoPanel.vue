<script setup lang="ts">
import { computed, ref } from 'vue'

import type { RoleId } from '@lgu/contracts'

import {
  ROLE_CATEGORY_LABEL,
  getRolePresentation,
} from '../constants/role-presentation'
import { appAsset } from '../constants/paths'
import {
  FALLBACK_ROLE_DETAIL_COMPONENT,
  ROLE_DETAIL_COMPONENTS,
} from './role-detail-components'

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
const roleCardBackImage = appAsset('/images/role-card-back.webp')
const revealed = ref(!props.revealable)
const roleDetailComponent = computed(() => (
  role ? ROLE_DETAIL_COMPONENTS[role.id] ?? FALLBACK_ROLE_DETAIL_COMPONENT : FALLBACK_ROLE_DETAIL_COMPONENT
))

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
          type="button"
          class="app-role-card app-role-card-face app-role-card-back"
          data-testid="role-reveal-card"
          aria-label="Révéler votre rôle"
          @click.stop="reveal"
        >
          <span class="app-role-card-back-symbols" aria-hidden="true">✦ ✧ 🐺 ✧ ✦</span>
          <img class="app-role-card-back-image" :src="roleCardBackImage" alt="">
          <strong>Toucher la carte pour révéler votre rôle</strong>
          <span class="app-role-card-back-sparkle-line" aria-hidden="true">✦ · ✧ · ✦</span>
        </button>
        <div class="app-role-card app-role-card-face app-role-card-front" :aria-hidden="!revealed">
          <div class="app-role-revealed-image-frame">
            <img class="app-role-revealed-image" :src="role.imagePath" :alt="role.name">
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

    <component
      v-if="!compact && (!revealable || revealed)"
      :is="roleDetailComponent"
      :power-title="powerTitle"
      :info-title="infoTitle"
      :current-role-id="role.id"
    />
  </div>
</template>
