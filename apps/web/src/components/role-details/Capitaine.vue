<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">Si le Capitaine est vivant et qu'il ne reste que <strong>trois
                personnes à
                la fin d'une journée sans exécution</strong>, le Village
            <strong>gagne</strong>.<br>Si le
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" /> cible le Capitaine pendant la nuit, le Maître du
            Jeu peut, <strong>s'il le souhaite</strong>, choisir secrètement une autre personne
            vivante: celle-ci <strong>meurt à sa place.</strong>
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">Votre pouvoir est entièrement passif : vous ne vous réveillez pas
            la nuit et le Maître du Jeu sera responsable de l'exécution de votre pouvoir.<br>Essayez
            de survivre jusqu'à ce que trois personnes restent en vie.<br><strong>Rappel:</strong>
            les Loups Garous
            gagnent lorsqu'il ne reste plus que deux personnes en vie.</p>
    </RoleDetailSection>
</template>
