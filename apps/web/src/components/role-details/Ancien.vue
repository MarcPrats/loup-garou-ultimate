<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Le
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" /> ne peut pas vous tuer.
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir vous permet d'annuler la morsure du
            Loup Garou Ultime toutes les nuits.<br>N'hésitez pas à vous faire
            passer pour une proie de ce dernier (en prétendant avoir de précieuses
            informations) afin qu'il s'en prenne à vous la nuit.
        </p>
    </RoleDetailSection>
    <RoleDetailSection class="app-role-intoxication-section"
        title="Attention à l'ivresse ou à l'empoisonnement" icon="⚠️">
        <p class="app-role-text">À tout moment du jeu, vous pouvez être ivre ou empoisonné(e), si
            c'est le cas alors
            votre protection contre le Loup Garou Ultime est annulée : il peut vous tuer.</p>
    </RoleDetailSection>
</template>
