<script setup lang="ts">
import { computed } from 'vue'

import { SPECIAL_INFORMATION_TYPE, TEAM, type HostDashboard } from '@lgu/contracts'

import { LEGACY_PAGE } from '../constants/app'
import { getRolePresentation } from '../constants/role-presentation'
import RoleAccessLink from './RoleAccessLink.vue'

const props = withDefaults(defineProps<{
  dashboard: HostDashboard
  showAccessLink?: boolean
}>(), {
  showAccessLink: true,
})
const emit = defineEmits<{ copied: [] }>()

const assignments = computed(() => props.dashboard.players.map((assignment) => ({
  ...assignment,
  rolePresentation: getRolePresentation(assignment.role.id),
  bluffPresentation: assignment.bluffRoleId ? getRolePresentation(assignment.bluffRoleId) : null,
  cluePresentation: assignment.specialInformation ? getRolePresentation(assignment.specialInformation.roleId) : null,
})))
</script>

<template>
  <div class="legacy-gm-view">
    <header class="legacy-gm-header">
      <h2>👑 Maître du Jeu</h2>
      <p class="legacy-subtitle">Vue d'ensemble de tous les rôles</p>
      <div class="legacy-gm-stats"><span class="legacy-gm-stat">🎮 {{ dashboard.playerCount }} Joueurs</span></div>
      <div class="legacy-gm-team-counts">
        <span class="legacy-gm-team-stat werewolf">🐺 {{ dashboard.werewolfCount }} Loups-Garous</span>
        <span class="legacy-gm-team-stat villager">👥 {{ dashboard.villagerTeamCount }} Villageois</span>
      </div>
    </header>

    <div class="legacy-gm-table-container">
      <table class="legacy-gm-table">
        <thead><tr><th>Joueur</th><th>Rôle</th><th>Équipe</th><th>Détails</th></tr></thead>
        <tbody>
          <tr v-for="assignment in assignments" :key="assignment.player.id">
            <td><div class="legacy-gm-player-name">{{ assignment.player.name }}</div></td>
            <td>
              <div class="legacy-gm-role-name">
                <img v-if="assignment.rolePresentation" class="legacy-gm-role-image" :src="assignment.rolePresentation.imagePath" :alt="assignment.rolePresentation.name">
                <span>{{ assignment.rolePresentation?.name ?? assignment.role.id }}</span>
              </div>
            </td>
            <td>
              <span class="legacy-gm-team-badge" :class="assignment.role.team === TEAM.WEREWOLVES ? 'team-werewolves' : 'team-villagers'">
                {{ assignment.role.team === TEAM.WEREWOLVES ? '🐺 Loup-Garou' : '👥 Villageois' }}
              </span>
            </td>
            <td><div class="legacy-gm-details">
              <span v-if="assignment.isDrunk" class="legacy-drunk-badge">🍺 Bourré</span>
              <div v-if="assignment.specialInformation" class="legacy-gm-detail-card clue">
                <strong>{{ assignment.specialInformation.type === SPECIAL_INFORMATION_TYPE.RENARD ? '🦊 Info Renard' : '👧 Info Petite Fille' }}</strong><br>
                {{ assignment.specialInformation.type === SPECIAL_INFORMATION_TYPE.RENARD ? 'Loup' : 'Villageois' }}: {{ assignment.cluePresentation?.name ?? assignment.specialInformation.roleId }}<br>
                Joueurs: {{ assignment.specialInformation.players.map((player) => player.name).join(', ') }}
              </div>
              <div v-if="assignment.bluffPresentation" class="legacy-gm-detail-card bluff"><strong>🎭 Rôle Bluff</strong><br>{{ assignment.bluffPresentation.name }}</div>
              <div v-if="assignment.isVoyanteDecoy" class="legacy-gm-detail-card decoy"><strong>🔮 Leurre Voyante</strong></div>
            </div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <a :href="LEGACY_PAGE.RULES" class="legacy-btn legacy-btn-secondary legacy-rules-button">📖 Consulter les Règles</a>
    <RoleAccessLink v-if="showAccessLink" class="legacy-private-link" :token="dashboard.roleAccessToken" @copied="emit('copied')" />
  </div>
</template>
