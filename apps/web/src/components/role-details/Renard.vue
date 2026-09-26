<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Lors de la <strong>première nuit</strong>, le Maître du Jeu vous
            montrera un rôle de
            <strong>Loup Garou</strong> (sauf celui du
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" />) puis pointera deux personnes.<br>L'une de ces
            deux
            personnes est le Loup Garou précédemment montré.
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir ne s'applique que lors de la première
            nuit.<br>N'hésitez
            pas à partager au plus vite vos informations.</p>
    </RoleDetailSection>
    <RoleDetailSection class="app-role-intoxication-section"
        title="Attention à l'ivresse ou à l'empoisonnement" icon="⚠️">
        <p class="app-role-text">À tout moment du jeu, vous pouvez être ivre ou empoisonné(e), si
            c'est le cas alors
            l'information que vous recevez peut être fausse.</p>
    </RoleDetailSection>
</template>
