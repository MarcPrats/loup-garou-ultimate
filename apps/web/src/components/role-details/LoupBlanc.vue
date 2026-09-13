<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text"><strong>Lorsque vous êtes inclus dans la partie,</strong> deux
            rôles de
            <strong>Villageois</strong> sont remplacés aléatoirement par deux rôles de
            <strong>Marginal</strong> distincts.
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text"><strong>Votre pouvoir a déjà été appliqué.</strong> Vous pouvez
            donc jouer de
            manière à attirer l'attention et distraire le village du
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" />.
        </p>
    </RoleDetailSection>
</template>
