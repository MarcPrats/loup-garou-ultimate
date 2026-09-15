<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text"><strong>Lorsque vous êtes concerné(e) par une information</strong>,
            le Maître du Jeu
            peut, s'il le souhaite, vous faire apparaître comme un <strong>Loup Garou</strong>, même
            après votre
            mort.</p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text"><strong>Votre pouvoir est entièrement contrôlé par le Maître du
                Jeu.</strong><br>Vous êtes une fausse piste pour les pouvoirs d'information: mentir
            sur votre
            rôle peut vous faire passer pour un véritable Loup Garou.<br><strong>Dites plutôt la
                vérité.</strong> D'ailleurs,
            si votre présence gêne les déductions du Village, vous pouvez demander à être exécutée.
        </p>
    </RoleDetailSection>
</template>
