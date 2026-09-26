<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Si une personne est <strong>exécutée par le village durant la
                journée</strong>, vous
            découvrez son identité la nuit.</p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir se déclenche uniquement après une exécution pendant
            la journée. N'hésitez donc pas à provoquer des exécutions pour innocenter ou accuser
            quelqu'un.</p>
    </RoleDetailSection>
    <RoleDetailSection class="app-role-intoxication-section"
        title="Attention à l'ivresse ou à l'empoisonnement" icon="⚠️">
        <p class="app-role-text">À tout moment du jeu, vous pouvez être ivre ou empoisonné(e), si
            c'est le cas alors
            l'identité révélée peut être fausse.</p>
    </RoleDetailSection>
</template>
