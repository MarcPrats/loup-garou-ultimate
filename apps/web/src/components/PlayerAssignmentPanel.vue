<script setup lang="ts">
import { computed } from 'vue'

import {
  SPECIAL_INFORMATION_TYPE,
  TEAM,
  type PrivateAssignment,
} from '@lgu/contracts'

import { LEGACY_PAGE } from '../constants/app'
import { LEGACY_ROLE_CONTENT } from '../constants/legacy-role-content'
import { getRolePresentation } from '../constants/role-presentation'
import RoleAccessLink from './RoleAccessLink.vue'

const props = withDefaults(defineProps<{
  assignment: PrivateAssignment
  showAccessLink?: boolean
}>(), {
  showAccessLink: true,
})
const emit = defineEmits<{ copied: [] }>()

const role = computed(() => getRolePresentation(props.assignment.role.id))
const roleContent = computed(() => LEGACY_ROLE_CONTENT[props.assignment.role.id])
const bluffRole = computed(() => props.assignment.bluffRoleId
  ? getRolePresentation(props.assignment.bluffRoleId)
  : null)
const bluffContent = computed(() => props.assignment.bluffRoleId
  ? LEGACY_ROLE_CONTENT[props.assignment.bluffRoleId]
  : null)
const teamLabel = computed(() => props.assignment.role.team === TEAM.WEREWOLVES
  ? '🐺 Loup-Garou'
  : '👥 Villageois')
const clueIsBluff = computed(() => props.assignment.bluffRoleId !== null)
const showClueKnowledgeSection = computed(() => (
  clueIsBluff.value && props.assignment.role.team === TEAM.WEREWOLVES
))
const clueTitle = computed(() => props.assignment.specialInformation?.type === SPECIAL_INFORMATION_TYPE.RENARD
  ? `🦊 Info Renard${clueIsBluff.value ? ' (Bluff)' : ''}`
  : `👧 Info Petite Fille${clueIsBluff.value ? ' (Bluff)' : ''}`)
const clueRole = computed(() => props.assignment.specialInformation
  ? getRolePresentation(props.assignment.specialInformation.roleId)
  : null)
</script>

<template>
  <div class="legacy-role-reveal">
    <span class="sr-only">{{ assignment.player.name }} · Votre couverture</span>
    <h2>Votre Rôle</h2>
    <div v-if="role" class="legacy-role-card">
      <div class="legacy-role-image-container">
        <img :src="role.imagePath" :alt="role.name">
      </div>
      <div class="legacy-role-info">
        <h3 class="legacy-role-title">{{ role.name }}</h3>
        <span class="legacy-role-team-badge" :class="assignment.role.team === TEAM.WEREWOLVES ? 'team-werewolves' : 'team-villagers'">
          {{ teamLabel }}
        </span>
      </div>
    </div>

    <div v-if="roleContent" class="legacy-role-description-container">
      <section class="legacy-description-section legacy-power-section">
        <div class="legacy-section-header"><span class="legacy-section-icon">⚡</span><h4>Votre Pouvoir</h4></div>
        <p class="legacy-section-text">{{ roleContent.power }}</p>
      </section>
      <section class="legacy-description-section legacy-info-section">
        <div class="legacy-section-header"><span class="legacy-section-icon">💡</span><h4>Autres Infos</h4></div>
        <p class="legacy-section-text">{{ roleContent.info }}</p>
      </section>
    </div>

    <div v-if="bluffRole && bluffContent" class="legacy-role-description-container legacy-bluff-section">
      <h3 class="legacy-bluff-title">🎭 Votre Rôle de Couverture</h3>
      <div class="legacy-role-card">
        <div class="legacy-role-image-container"><img :src="bluffRole.imagePath" :alt="bluffRole.name"></div>
        <div class="legacy-role-info"><h4>{{ bluffRole.name }}</h4></div>
      </div>
      <section class="legacy-description-section legacy-power-section">
        <div class="legacy-section-header"><span class="legacy-section-icon">⚡</span><h4>Pouvoir (Bluff)</h4></div>
        <p class="legacy-section-text">{{ bluffContent.power }}</p>
      </section>
      <section class="legacy-description-section legacy-info-section">
        <div class="legacy-section-header"><span class="legacy-section-icon">💡</span><h4>Infos (Bluff)</h4></div>
        <p class="legacy-section-text">{{ bluffContent.info }}</p>
      </section>
    </div>

    <div v-if="assignment.specialInformation && assignment.bluffRoleId !== null && assignment.role.team === TEAM.WEREWOLVES" class="legacy-role-description-container legacy-bluff-special-section">
      <h3 class="legacy-clue-title">🔍 {{ clueIsBluff ? 'Informations du rôle de couverture (Bluff)' : 'Informations privées' }}</h3>
      <section class="legacy-description-section">
        <div v-if="showClueKnowledgeSection" class="legacy-section-header"><span class="legacy-section-icon">🎭</span><h4>Ce que vous devriez savoir</h4></div>
        <p class="legacy-section-text">
          <strong>{{ clueTitle }}</strong><br>
          {{ assignment.specialInformation.type === SPECIAL_INFORMATION_TYPE.RENARD ? 'Loup' : 'Villageois' }} : {{ clueRole?.name ?? assignment.specialInformation.roleId }}<br>
          Joueurs : {{ assignment.specialInformation.players.map((player) => player.name).join(', ') }}
        </p>
      </section>
    </div>

    <a :href="LEGACY_PAGE.RULES" class="legacy-btn legacy-btn-secondary legacy-rules-button">📖 Consulter les Règles</a>

    <RoleAccessLink v-if="showAccessLink" class="legacy-private-link" :token="assignment.roleAccessToken" @copied="emit('copied')" />
  </div>
</template>
