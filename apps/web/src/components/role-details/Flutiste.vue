<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Pendant la journée, si une personne vous désigne pour une exécution
            et que cette personne est un villageois (à part si c'est un marginal), alors elle est
            immédiatement exécutée.<br>Ce pouvoir n'est utilisé qu'une seule fois.<br>ATTENTION : ne
            dites rien lorsque c'est le cas.<br>Le Maître du Jeu interviendra à ce moment précis.
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Ce pouvoir vous permet de vous protéger des mauvaises accusations,
            donc n'hésitez pas à l'énoncer si on vous accuse à tort.</p>
    </RoleDetailSection>
</template>
