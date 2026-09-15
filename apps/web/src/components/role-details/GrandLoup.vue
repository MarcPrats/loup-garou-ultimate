<script setup lang="ts">
import RoleDetailSection from '../RoleDetailSection.vue'
import RoleMentionLink from '../RoleMentionLink.vue'

defineProps<{ powerTitle: string; infoTitle: string; currentRoleId: string }>()
</script>

<template>
    <RoleDetailSection :title="powerTitle" icon="⚡">
        <p class="app-role-text">S'il reste plus de <strong>5 personnes en vie</strong> et que le
            <RoleMentionLink role-id="loup-garou-ultime" label="Loup Garou Ultime" team="werewolf"
                :current-role-id="currentRoleId" /> <strong>meurt</strong>, vous devenez le
            <strong>Loup Garou Ultime</strong>.
        </p>
    </RoleDetailSection>
    <RoleDetailSection :title="infoTitle" icon="💡">
        <p class="app-role-text">
            Le Grand Loup Garou prend connaissance d'un rôle de Villageois qui n'est pas présent
            dans la partie afin de pouvoir se faire passer pour celui-ci. </p>
    </RoleDetailSection>
</template>
