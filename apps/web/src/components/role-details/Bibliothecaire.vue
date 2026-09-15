<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text"><strong>Lors de la première nuit,</strong> le Maître du Jeu vous
            montrera un rôle de
            Marginal puis pointera deux personnes (ou zéro s'il n'y en a aucun).<br>L'une de ces
            deux personnes est le Marginal précédemment montré.</p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir ne s'applique que lors de la première
            nuit. N'hésitez
            pas à partager au <strong>plus vite</strong> vos informations.</p>
    </RoleDetailSection>
</template>
