<script setup lang="ts">
import { computed } from 'vue'

import { ROUTE_PATH } from '../constants/app'
import { appPath } from '../constants/paths'

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
const roleDetailPath = computed(() => appPath(ROUTE_PATH.ROLE_DETAIL.replace(':roleId', props.roleId)))
const className = computed(() => props.team === 'werewolf'
  ? 'app-role-mention app-role-mention-werewolf'
  : 'app-role-mention app-role-mention-villager')
</script>

<template>
  <span v-if="!shouldRenderLink" :class="className">{{ label }}</span>
  <a
    v-else
    :href="roleDetailPath"
    :class="className"
    target="_blank"
    rel="noopener noreferrer"
    @click.stop
  >
    {{ label }}
  </a>
</template>
