<script setup lang="ts">
import { computed } from 'vue'

import {
  TEAM,
  type GameStartPreview,
  type HostDashboard,
} from '@lgu/contracts'

import { ROUTE_PATH } from '../constants/app'
import { appPath } from '../constants/paths'
import { getRolePresentation } from '../constants/role-presentation'
import { getSpecialInformationPresentation } from '../constants/special-information'
import HostNightOrderPanel from './HostNightOrderPanel.vue'
import HostMobileAssignmentCard from './HostMobileAssignmentCard.vue'

const props = withDefaults(defineProps<{
  dashboard: HostDashboard | GameStartPreview
  showNightOrder?: boolean
  showRulesLink?: boolean
  showHeader?: boolean
  embedded?: boolean
}>(), {
  showNightOrder: true,
  showRulesLink: true,
  showHeader: true,
  embedded: false,
})

const assignments = computed(() => props.dashboard.players.map((assignment) => ({
  ...assignment,
  rolePresentation: getRolePresentation(assignment.role.id),
  bluffPresentation: assignment.bluffRoleId ? getRolePresentation(assignment.bluffRoleId) : null,
  cluePresentation: assignment.specialInformation?.roleId ? getRolePresentation(assignment.specialInformation.roleId) : null,
  clueRoleName: assignment.specialInformation?.players.some((player) => player.isDrunk)
    ? 'Ivrogne'
    : assignment.specialInformation?.roleId
      ? getRolePresentation(assignment.specialInformation.roleId)?.name ?? assignment.specialInformation.roleId
      : null,
})))
const nightOrderDashboard = computed<HostDashboard | null>(() => (
  'roleAccessToken' in props.dashboard ? props.dashboard : null
))
</script>

<template>
  <div :class="embedded ? 'app-private-dashboard' : 'app-gm-view'">
    <header v-if="showHeader" class="app-gm-header">
      <h2>👑 Maître du Jeu</h2>
      <p class="app-subtitle">Vue d'ensemble de tous les rôles</p>
      <div class="app-gm-stats"><span class="app-gm-stat">🎮 {{ dashboard.playerCount }} Joueurs</span></div>
      <div class="app-gm-team-counts">
        <span class="app-gm-team-stat werewolf">🐺 {{ dashboard.werewolfCount }} Loups-Garous</span>
        <span class="app-gm-team-stat villager">👥 {{ dashboard.villagerTeamCount }} Villageois</span>
      </div>
    </header>

    <div class="app-gm-table-container">
      <table class="app-gm-table">
        <thead><tr><th>Joueur</th><th>Rôle</th><th>Équipe</th><th>Détails</th></tr></thead>
        <tbody>
          <tr v-for="assignment in assignments" :key="assignment.player.id">
            <td><div class="app-gm-player-name">{{ assignment.player.name }}</div></td>
            <td>
              <div class="app-gm-role-name">
                <span v-if="assignment.rolePresentation" class="app-gm-role-image-frame">
                  <img class="app-gm-role-image" :src="assignment.rolePresentation.imagePath" :alt="assignment.rolePresentation.name">
                </span>
                <span>{{ assignment.rolePresentation?.name ?? assignment.role.id }}</span>
              </div>
            </td>
            <td>
              <span class="app-gm-team-badge" :class="assignment.role.team === TEAM.WEREWOLVES ? 'team-werewolves' : 'team-villagers'">
                {{ assignment.role.team === TEAM.WEREWOLVES ? '🐺 Loup-Garou' : '👥 Villageois' }}
              </span>
            </td>
            <td><div class="app-gm-details">
              <span v-if="assignment.isDrunk" class="app-drunk-badge">🍺 Bourré</span>
              <div v-if="assignment.specialInformation" class="app-gm-detail-card clue">
                <strong>{{ getSpecialInformationPresentation(assignment.specialInformation.type).label }}</strong><br>
                {{ getSpecialInformationPresentation(assignment.specialInformation.type).targetLabel }}: {{ assignment.clueRoleName ?? (assignment.specialInformation.roleId ?? 'Pas d’info') }}<br>
                <span v-if="assignment.specialInformation.players.length > 0">Joueurs: {{ assignment.specialInformation.players.map((player) => player.name).join(', ') }}</span>
              </div>
              <div v-if="assignment.bluffPresentation" class="app-gm-detail-card bluff"><strong>🎭 Rôle Bluff</strong><br>{{ assignment.bluffPresentation.name }}</div>
              <div v-if="assignment.isVoyanteDecoy" class="app-gm-detail-card decoy"><strong>🔮 Leurre Voyante</strong></div>
            </div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="app-gm-mobile-cards" aria-label="Détails des joueurs">
      <HostMobileAssignmentCard
        v-for="assignment in assignments"
        :key="`mobile-${assignment.player.id}`"
        :assignment="assignment"
      />
    </div>

    <HostNightOrderPanel v-if="showNightOrder && nightOrderDashboard" :dashboard="nightOrderDashboard" />

    <a v-if="showRulesLink" :href="appPath(ROUTE_PATH.RULES)" class="app-btn app-btn-secondary app-rules-button" target="_blank" rel="noopener noreferrer">📖 Consulter les Règles</a>
  </div>
</template>
