<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Chaque nuit, choisissez une personne.<br>Cette personne est
            empoisonnée et ne bénéficie plus de son pouvoir jusqu'au début de la prochaine nuit.</p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">L'Infect Loup Garou prend connaissance d'un rôle de villageois qui
            n'est pas présent dans la partie.<br>Le poison annule ou altère les pouvoirs des
            villageois.<br>De bonnes cibles pour l'empoisonnement sont
            <RoleMentionLink role-id="cupidon" label="Cupidon" team="villager"
                :current-role-id="currentRoleId" />, la
            <RoleMentionLink role-id="voyante" label="Voyante" team="villager"
                :current-role-id="currentRoleId" />, l'
            <RoleMentionLink role-id="ancien" label="Ancien" team="villager"
                :current-role-id="currentRoleId" /> ou le
            <RoleMentionLink role-id="chevalier" label="Chevalier" team="villager"
                :current-role-id="currentRoleId" /> dont les pouvoirs vous gêneront amplement.
        </p>
    </RoleDetailSection>
</template>
