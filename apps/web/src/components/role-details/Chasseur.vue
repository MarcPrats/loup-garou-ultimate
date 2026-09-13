<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text"><strong>Une fois par partie, pendant la journée, choisissez
                publiquement
                une personne.</strong><br>Si c'est le
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" />, elle meurt.
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text"><strong>Votre pouvoir ne se réalise qu'une seule fois</strong> donc
            essayez de
            l'utiliser avant de mourir.<br>Même si vous vous trompez, votre cible ne mourra pas et
            vous saurez que ce n'est pas le
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" />.
        </p>
    </RoleDetailSection>
</template>
