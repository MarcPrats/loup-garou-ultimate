<script setup lang="ts">
import RulesNightStep from './RulesNightStep.vue'
import type { RulesNightSectionData } from '../constants/rules-page'

defineProps<{
  title: string
  sections: readonly RulesNightSectionData[]
}>()
</script>

<template>
  <div class="night-block">
    <div class="night-block-header">{{ title }}</div>
    <template v-for="section in sections" :key="section.label">
      <div class="night-separator">{{ section.label }}</div>
      <RulesNightStep v-for="step in section.steps" :key="step.title" :step="step" />
    </template>
  </div>
</template>
