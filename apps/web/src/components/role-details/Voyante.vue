<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Chaque nuit, choisissez deux personnes.<br>Si au moins l'une
            d'elles est le
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" />, vous aurez
            l'information.<br>
            <strong>ATTENTION: l'une
                des personnes de la partie a été désignée par le Maître du Jeu comme un leurre. Si
                vous la
                choisissez, elle vous apparaîtra comme le Loup Garou Ultime
                !</strong>
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir s'applique chaque nuit et vous serez probablement une
            cible pour le Loup Garou Ultime.<br>Votre <strong>discrétion</strong> peut être un atout
            pour ne
            pas tenter sa morsure.
        </p>
    </RoleDetailSection>
    <RoleDetailSection class="app-role-intoxication-section"
        title="Attention à l'ivresse ou à l'empoisonnement" icon="⚠️">
        <p class="app-role-text">À tout moment du jeu, vous pouvez être ivre ou empoisonné(e), si
            c'est le cas alors l'information donnée par le Maître du Jeu peut être fausse.</p>
    </RoleDetailSection>
</template>
