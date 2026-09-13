<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text"><strong>Lors de la première nuit,</strong> le maître du jeu vous
            montrera un rôle de
            Loup Garou (sauf celui du
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" />) puis pointera deux personnes.<br>L'une de ces
            deux
            personnes est le Loup Garou précédemment montré.
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text"><strong>Votre pouvoir ne s'applique que lors de la première
                nuit.</strong><br>N'hésitez
            pas à partager au plus vite vos informations.</p>
    </RoleDetailSection>
</template>
