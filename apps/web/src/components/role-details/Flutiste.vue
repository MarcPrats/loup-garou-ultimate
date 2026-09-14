<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Pendant la journée, si une personne<strong> vous désigne pour une
                exécution</strong>
            et que cette personne est un <strong>Villageois</strong> (sauf si c'est un Marginal),
            alors elle est
            <strong>immédiatement exécutée</strong>.<br>Ce pouvoir n'est utilisé qu'<strong>une
                seule
                fois.</strong><br><strong>Note:</strong> Votre pouvoir est passif, vous n'avez rien
            besoin de faire. Le Maître du Jeu
            interviendra si nécessaire.
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Ce pouvoir vous permet de vous protéger des mauvaises accusations,
            donc n'hésitez pas à l'énoncer si on vous accuse à tort.</p>
    </RoleDetailSection>
</template>
