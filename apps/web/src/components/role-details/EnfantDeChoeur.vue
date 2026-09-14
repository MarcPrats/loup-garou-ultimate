<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">À votre mort, le Maître du Jeu choisit une personne qui devient
            <strong>bourrée</strong> pour le reste de la partie.
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Essayez de garder votre rôle secret.<br>Votre mort pénaliserait le
            village car le Maître du Jeu choisira probablement un Villageois.<br>Essayez de vous
            faire
            passer pour un personnage gênant pour le
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" /> tel que l'
            <RoleMentionLink role-id="ancien" label="Ancien" team="villager"
                :current-role-id="currentRoleId" /> ou l'
            <RoleMentionLink role-id="ange" label="Ange" team="villager"
                :current-role-id="currentRoleId" />.
        </p>
    </RoleDetailSection>
</template>
