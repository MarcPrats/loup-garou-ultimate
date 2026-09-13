<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  roleId: string
  label: string
  team?: 'villager' | 'werewolf'
  currentRoleId?: string | null
  linked?: boolean
}>(), {
  team: 'villager',
  currentRoleId: null,
  linked: true,
})

const isSelfLink = computed(() => Boolean(props.currentRoleId) && props.currentRoleId === props.roleId)
const shouldRenderLink = computed(() => props.linked && !isSelfLink.value)
const className = computed(() => props.team === 'werewolf'
  ? 'app-role-mention app-role-mention-werewolf'
  : 'app-role-mention app-role-mention-villager')
</script>

<template>
  <span v-if="!shouldRenderLink" :class="className">{{ label }}</span>
  <a
    v-else
    :href="`/rules/role/${roleId}`"
    :class="className"
    target="_blank"
    rel="noopener noreferrer"
    @click.stop
  >
    {{ label }}
  </a>
</template>
