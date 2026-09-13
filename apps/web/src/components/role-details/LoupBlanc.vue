<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
  <RoleDetailSection :title="powerTitle" icon="⚡"><p class="app-role-text">Lorsque vous êtes inclus dans la partie, deux rôles de Villageois sont remplacés aléatoirement par deux rôles de Marginal distincts.</p></RoleDetailSection>
  <RoleDetailSection :title="infoTitle" icon="💡"><p class="app-role-text">Votre pouvoir a déjà été appliqué, vous pouvez donc jouer de manière à attirer l'attention et distraire le village du <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf" :current-role-id="currentRoleId" />.</p></RoleDetailSection>
</template>
