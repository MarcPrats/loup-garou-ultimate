<script setup lang="ts">
import type { RoleId } from '@lgu/contracts'

import {
  ROLE_CATEGORY_LABEL,
  getRolePresentation,
} from '../constants/role-presentation'

const props = defineProps<{
  roleId: RoleId
  title?: string
  powerTitle: string
  infoTitle: string
  compact?: boolean
}>()
const role = getRolePresentation(props.roleId)
</script>

<template>
  <div v-if="role" class="app-role-description-container app-bluff-section" :class="{ 'app-role-info-compact': compact }">
    <h3 v-if="title" class="app-bluff-title">{{ title }}</h3>
    <div class="app-role-card">
      <div class="app-role-image-container">
        <img :src="role.imagePath" :alt="role.name">
      </div>
      <div class="app-role-info">
        <h4>{{ role.name }}</h4>
        <p class="app-role-category">{{ ROLE_CATEGORY_LABEL[role.category] }}</p>
      </div>
    </div>
    <template v-if="!compact">
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
