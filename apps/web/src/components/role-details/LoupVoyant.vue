<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text"><strong>Vous avez accès aux informations du Maître du
                Jeu.</strong><br>De même, vous
            pouvez être perçu comme <strong>Villageois</strong> ou <strong>Marginal</strong> par les
            pouvoirs d'information, même
            après votre mort.</p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text"><strong>Utilisez vos informations</strong> pour aider les
            <strong>Loups Garous</strong> sans révéler
            trop clairement votre véritable rôle.</p>
    </RoleDetailSection>
</template>
