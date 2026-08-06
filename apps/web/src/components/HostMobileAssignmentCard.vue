<script setup lang="ts">
import { computed } from 'vue'

import {
  SPECIAL_INFORMATION_TYPE,
  TEAM,
  type HostPlayerAssignment,
} from '@lgu/contracts'

import type { RolePresentation } from '../constants/role-presentation'

type MobileAssignment = HostPlayerAssignment & {
  rolePresentation: RolePresentation | null
  bluffPresentation: RolePresentation | null
  cluePresentation: RolePresentation | null
}

const props = defineProps<{
  assignment: MobileAssignment
}>()

const roleName = computed(() => (
  props.assignment.rolePresentation?.name ?? props.assignment.role.id
))
const teamLabel = computed(() => (
  props.assignment.role.team === TEAM.WEREWOLVES ? '🐺 Loup-Garou' : '👥 Villageois'
))
const specialInformationLabel = computed(() => (
  props.assignment.specialInformation?.type === SPECIAL_INFORMATION_TYPE.RENARD
    ? '🦊 Info Renard'
    : '👧 Info Petite Fille'
))
const specialInformationTarget = computed(() => (
  props.assignment.specialInformation?.type === SPECIAL_INFORMATION_TYPE.RENARD
    ? 'Loup'
    : 'Villageois'
))
</script>

<template>
  <article class="app-gm-mobile-card">
    <header class="app-gm-mobile-card-header">
      <div class="app-gm-mobile-player">
        <h3 class="app-gm-player-name">{{ assignment.player.name }}</h3>
      </div>
      <span class="app-gm-team-badge" :class="assignment.role.team === TEAM.WEREWOLVES ? 'team-werewolves' : 'team-villagers'">
        {{ teamLabel }}
      </span>
    </header>

    <div class="app-gm-mobile-role">
      <img
        v-if="assignment.rolePresentation"
        class="app-gm-role-image"
        :src="assignment.rolePresentation.imagePath"
        :alt="assignment.rolePresentation.name"
      >
      <div>
        <span class="app-gm-mobile-label">Rôle</span>
        <strong>{{ roleName }}</strong>
      </div>
    </div>

    <div class="app-gm-mobile-badges">
      <span v-if="assignment.isDrunk" class="app-drunk-badge">🍺 Bourré</span>
      <span v-if="assignment.isVoyanteDecoy" class="app-gm-detail-card decoy">🔮 Leurre Voyante</span>
      <span v-if="assignment.bluffPresentation" class="app-gm-detail-card bluff">
        🎭 Rôle Bluff : {{ assignment.bluffPresentation.name }}
      </span>
    </div>

    <div class="app-gm-mobile-details">
      <div v-if="assignment.specialInformation" class="app-gm-detail-card clue">
        <strong>{{ specialInformationLabel }}</strong>
        <span>{{ specialInformationTarget }} : {{ assignment.cluePresentation?.name ?? assignment.specialInformation.roleId }}</span>
        <span>Joueurs : {{ assignment.specialInformation.players.map((player) => player.name).join(', ') }}</span>
      </div>
    </div>
  </article>
</template>
