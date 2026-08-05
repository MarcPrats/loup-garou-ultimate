<script setup lang="ts">
import type { RulesNightStepData } from '../constants/rules-page'

defineProps<{ step: RulesNightStepData }>()
</script>

<template>
  <div class="night-step">
    <img
      v-if="step.imagePath"
      class="night-step-icon"
      :src="step.imagePath"
      :alt="step.imageAlt ?? step.title"
    >
    <div v-else class="night-step-emoji">{{ step.emoji ?? '❔' }}</div>
    <div class="night-step-body">
      <strong>{{ step.title }}</strong>
      <span v-if="step.condition" class="night-cond">{{ step.condition }}</span>
      <span
        v-for="(line, index) in step.lines"
        :key="`${step.title}-${index}`"
        :class="line.kind === 'eye' ? 'eye' : undefined"
      >
        {{ line.kind === 'eye' ? '👁 ' : '' }}{{ line.text }}
      </span>
    </div>
  </div>
</template>
