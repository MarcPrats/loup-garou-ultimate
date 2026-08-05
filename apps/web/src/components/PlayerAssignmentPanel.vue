<script setup lang="ts">
import { computed } from 'vue'

import {
  SPECIAL_INFORMATION_TYPE,
  TEAM,
  type PrivateAssignment,
} from '@lgu/contracts'

import { ROUTE_PATH } from '../constants/app'
import { ROLE_CONTENT } from '../constants/role-content'
import { getRolePresentation } from '../constants/role-presentation'
import RoleCard from './RoleCard.vue'

const props = withDefaults(defineProps<{
  assignment: PrivateAssignment
}>(), {
})

const bluffRole = computed(() => props.assignment.bluffRoleId
  ? getRolePresentation(props.assignment.bluffRoleId)
  : null)
const bluffContent = computed(() => props.assignment.bluffRoleId
  ? ROLE_CONTENT[props.assignment.bluffRoleId]
  : null)
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
  <div class="app-role-reveal">
    <span class="sr-only">{{ assignment.player.name }} · Votre couverture</span>
    <h2>Votre Rôle</h2>
    <RoleCard :role-id="assignment.role.id" eyebrow="Votre rôle" />

    <div v-if="bluffRole && bluffContent" class="app-role-description-container app-bluff-section">
      <h3 class="app-bluff-title">🎭 Votre Rôle de Couverture</h3>
      <div class="app-role-card">
        <div class="app-role-image-container"><img :src="bluffRole.imagePath" :alt="bluffRole.name"></div>
        <div class="app-role-info"><h4>{{ bluffRole.name }}</h4></div>
      </div>
      <section class="app-description-section app-power-section">
        <div class="app-section-header"><span class="app-section-icon">⚡</span><h4>Pouvoir (Bluff)</h4></div>
        <p class="app-section-text">{{ bluffContent.power }}</p>
      </section>
      <section class="app-description-section app-info-section">
        <div class="app-section-header"><span class="app-section-icon">💡</span><h4>Infos (Bluff)</h4></div>
        <p class="app-section-text">{{ bluffContent.info }}</p>
      </section>
    </div>

    <div v-if="assignment.specialInformation && assignment.bluffRoleId !== null && assignment.role.team === TEAM.WEREWOLVES" class="app-role-description-container app-bluff-special-section">
      <h3 class="app-clue-title">🔍 {{ clueIsBluff ? 'Informations du rôle de couverture (Bluff)' : 'Informations privées' }}</h3>
      <section class="app-description-section">
        <div v-if="showClueKnowledgeSection" class="app-section-header"><span class="app-section-icon">🎭</span><h4>Ce que vous devriez savoir</h4></div>
        <p class="app-section-text">
          <strong>{{ clueTitle }}</strong><br>
          {{ assignment.specialInformation.type === SPECIAL_INFORMATION_TYPE.RENARD ? 'Loup' : 'Villageois' }} : {{ clueRole?.name ?? assignment.specialInformation.roleId }}<br>
          Joueurs : {{ assignment.specialInformation.players.map((player) => player.name).join(', ') }}
        </p>
      </section>
    </div>

    <a :href="ROUTE_PATH.RULES" class="app-btn app-btn-secondary app-rules-button">📖 Consulter les Règles</a>
  </div>
</template>
