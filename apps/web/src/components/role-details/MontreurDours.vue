<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Lors de la première nuit, vous découvrez combien de Loup Garous
            sont placés côte à côte.</p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir ne s'applique que lors de la première
            nuit.<br>N'hésitez pas à partager au plus vite vos informations.</p>
    </RoleDetailSection>
</template>
