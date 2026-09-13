<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Chaque nuit, parmi les deux personnes vivantes qui vous entourent,
            vous apprenez combien de Loup Garous vous entourent (0, 1 ou 2).</p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir s'applique chaque nuit et vous serez probablement une
            cible pour le
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" />.<br>Votre discrétion peut être un atout pour ne
            pas
            tenter sa morsure.
        </p>
    </RoleDetailSection>
</template>
