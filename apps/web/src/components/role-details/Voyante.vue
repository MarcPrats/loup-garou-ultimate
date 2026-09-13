<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Chaque nuit, choisissez deux personnes.<br>Si au moins l'une
            d'elles est le
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" />, vous aurez l'information.<br>ATTENTION : l'une
            des personnes est un leurre et vous apparaîtra comme le
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" /> !
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir s'applique chaque nuit et vous serez probablement une
            cible pour le
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" />.<br>Votre discrétion peut être un atout pour ne
            pas tenter sa morsure.
        </p>
    </RoleDetailSection>
</template>
