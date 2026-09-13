<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
  <RoleDetailSection :title="powerTitle" icon="⚡"><p class="app-role-text">Si une personne est exécutée par le village durant la journée, vous découvrez son identité la nuit.</p></RoleDetailSection>
  <RoleDetailSection :title="infoTitle" icon="💡"><p class="app-role-text">Votre pouvoir se déclenche uniquement après l'exécution du jour, donc n'hésitez pas à déclencher des exécutions pour innocenter/accuser quelqu'un.</p></RoleDetailSection>
</template>
