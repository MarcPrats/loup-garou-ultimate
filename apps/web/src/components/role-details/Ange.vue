<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text"><strong>Si le village vous élimine, le village perd la
                partie.</strong></p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text"><strong>Votre personnage peut vous protéger de fausses
                accusations</strong> en
            révélant votre rôle.<br>Donc n'hésitez pas à l'énoncer pour vous protéger.</p>
    </RoleDetailSection>
</template>
