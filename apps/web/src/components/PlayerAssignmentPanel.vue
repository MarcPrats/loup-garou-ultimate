<script setup lang="ts">
import { computed } from 'vue'

import {
  SPECIAL_INFORMATION_TYPE,
  TEAM,
  type HostDashboard,
  type PrivateAssignment,
} from '@lgu/contracts'

import { ROUTE_PATH } from '../constants/app'
import { appPath } from '../constants/paths'
import { getRolePresentation } from '../constants/role-presentation'
import HostDashboardPanel from './HostDashboardPanel.vue'
import RoleInfoPanel from './RoleInfoPanel.vue'

const props = withDefaults(defineProps<{
  assignment: PrivateAssignment
  dashboard?: HostDashboard | null
  showRulesLink?: boolean
}>(), {
  showRulesLink: true,
})


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
  <div class="app-role-reveal" :class="{ 'app-role-reveal-has-bluff': assignment.bluffRoleId !== null }">
    <span class="sr-only">{{ assignment.player.name }} · Votre couverture</span>
    <RoleInfoPanel
      :role-id="assignment.role.id"
      title="🎭 Votre Rôle"
      power-title="Votre Pouvoir"
      info-title="Autres Infos"
    />

    <RoleInfoPanel
      v-if="assignment.bluffRoleId !== null"
      :role-id="assignment.bluffRoleId"
      title="🎭 Votre Rôle de Couverture"
      power-title="Pouvoir (Bluff)"
      info-title="Infos (Bluff)"
    />

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

    <div
      v-if="dashboard"
      class="mt-8 border-t border-white/10 pt-8"
    >
      <HostDashboardPanel
        :dashboard="dashboard"
        :show-night-order="false"
        :show-rules-link="false"
        :show-header="false"
      />
    </div>

    <a v-if="showRulesLink" :href="appPath(ROUTE_PATH.RULES)" class="app-btn app-btn-secondary app-rules-button" target="_blank" rel="noopener noreferrer">📖 Consulter les Règles</a>
  </div>
</template>
