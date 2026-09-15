<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text"><strong>Vous ne savez pas que vous êtes l'Ivrogne.</strong><br>Vous
            croyez être un
            Villageois, mais ce n'est pas le cas.</p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text"><strong>Note:</strong> pensez à consommer de l'alcool avec
            modération. L'abus
            d'alcool est dangereux pour la santé.</p>
    </RoleDetailSection>
</template>
