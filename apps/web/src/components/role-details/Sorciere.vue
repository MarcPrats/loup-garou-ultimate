<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Si vous <strong>mourez la nuit</strong>, vous choisissez une
            personne et <strong>découvrez</strong>
            son identité.</p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir se déclenche à votre mort.<br>N'hésitez pas à vous
            faire
            passer pour un personnage en possession d'informations afin d'attirer la morsure d'un
            Loup Garou.<br>Si vous vous faites <strong>éliminer par le village</strong>, votre
            pouvoir ne se
            déclenchera
            pas.</p>
    </RoleDetailSection>
</template>
