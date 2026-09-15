<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Lors de la <strong>première nuit</strong>, le Maître du Jeu vous
            montrera un rôle de
            <strong>Villageois</strong> puis pointera deux personnes.<br>L'une de ces deux personnes
            est le
            Villageois montré.
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir ne s'applique que lors de la première
            nuit. N'hésitez pas à partager au <strong>plus vite</strong> vos informations.</p>
    </RoleDetailSection>
</template>
