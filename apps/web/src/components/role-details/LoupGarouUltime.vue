<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Chaque nuit (sauf la première), choisissez une
            personne.<br><strong>
                Elle meurt</strong>.<br><strong>Note :</strong> Vous pouvez choisir de vous tuer
            vous-même et un autre
            Loup Garou
            jouera
            votre rôle.</p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Le Loup Garou Ultime prend connaissance d'un rôle de Villageois qui
            n'est pas présent dans la partie afin de pouvoir se faire passer pour
            celui-ci.<br>Ciblez
            les personnages qui acquièrent de l'information (
            <RoleMentionLink role-id="voyante" label="Voyante" team="villager"
                :current-role-id="currentRoleId" />,
            <RoleMentionLink role-id="enfant-sauvage" label="Enfant sauvage" team="villager"
                :current-role-id="currentRoleId" />,
            <RoleMentionLink role-id="cupidon" label="Cupidon" team="villager"
                :current-role-id="currentRoleId" />) et évitez de mordre l'
            <RoleMentionLink role-id="ancien" label="Ancien" team="villager"
                :current-role-id="currentRoleId" />.
        </p>
    </RoleDetailSection>
</template>
