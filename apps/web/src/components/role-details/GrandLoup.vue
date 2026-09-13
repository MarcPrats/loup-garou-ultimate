<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
  <RoleDetailSection :title="powerTitle" icon="⚡"><p class="app-role-text">S'il y a toujours plus de 5 personnes en vie et que le <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf" :current-role-id="currentRoleId" /> meurt, vous devenez le <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf" :current-role-id="currentRoleId" />.</p></RoleDetailSection>
  <RoleDetailSection :title="infoTitle" icon="💡"><p class="app-role-text">Le Grand Loup Garou prend connaissance d'un rôle de villageois qui n'est pas présent dans la partie afin de pouvoir se faire passer pour celui-ci.</p></RoleDetailSection>
</template>
