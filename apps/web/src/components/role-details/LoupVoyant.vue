<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Vous avez accès aux informations du Maître du Jeu.<br>De même, vous
            pouvez être perçu comme Villageois ou Marginal par les pouvoirs d'information, même
            après votre mort.</p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Utilisez vos informations pour aider les Loups Garous sans révéler
            trop clairement votre véritable rôle.</p>
    </RoleDetailSection>
</template>
