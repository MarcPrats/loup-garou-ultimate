<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Chaque nuit (sauf la première), choisissez une <strong>autre
                personne</strong> que
            vous : elle est protégée de la morsure du
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" /> le temps d'une nuit.
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir peut être précieux pour des personnages acquérant
            régulièrement des informations ou ayant un pouvoir unique.<br>
            <RoleMentionLink role-id="cupidon" label="Cupidon" team="villager"
                :current-role-id="currentRoleId" />, la
            <RoleMentionLink role-id="voyante" label="Voyante" team="villager"
                :current-role-id="currentRoleId" /> ou le
            <RoleMentionLink role-id="chasseur" label="Chasseur" team="villager"
                :current-role-id="currentRoleId" /> sont de bons exemples.<br>Essayez vite de les
            identifier afin de les protéger.
        </p>
    </RoleDetailSection>
</template>
