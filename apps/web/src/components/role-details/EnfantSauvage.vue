<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Si une personne est exécutée par le village durant la journée, vous
            découvrez son identité la nuit.</p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir se déclenche uniquement après une exécution pendant
            la journée. N'hésitez donc pas à provoquer des exécutions pour innocenter ou accuser
            quelqu'un.</p>
    </RoleDetailSection>
</template>
