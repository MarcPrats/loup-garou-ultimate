<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text"><strong>Pendant la journée, si une personne vous désigne pour une
                exécution</strong>
            et que cette personne est un villageois (sauf si c'est un marginal), alors elle est
            immédiatement exécutée.<br><strong>Ce pouvoir n'est utilisé qu'une seule
                fois.</strong><br><strong>Note: Pas besoin de l'énoncer lorsque c'est le
                cas.</strong><br>Le Maître du Jeu interviendra à ce
            moment précis.
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Ce pouvoir vous permet de vous protéger des mauvaises accusations,
            donc n'hésitez pas à l'énoncer si on vous accuse à tort.</p>
    </RoleDetailSection>
</template>
