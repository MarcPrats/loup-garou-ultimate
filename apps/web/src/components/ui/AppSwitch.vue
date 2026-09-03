<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  label: string
  description?: string
  disabled?: boolean
  inputTestId?: string
}>(), {
  description: undefined,
  disabled: false,
  inputTestId: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function updateValue(event: Event): void {
  const input = event.target
  if (input instanceof HTMLInputElement) emit('update:modelValue', input.checked)
}
</script>

<template>
  <label class="app-switch">
    <span class="app-switch-copy">
      <span class="app-switch-label">{{ label }}</span>
      <span v-if="description" class="app-switch-description">{{ description }}</span>
    </span>
    <input
      :checked="props.modelValue"
      :disabled="props.disabled"
      :data-testid="props.inputTestId"
      class="app-switch-input"
      type="checkbox"
      role="switch"
      :aria-checked="props.modelValue"
      @change="updateValue"
    >
    <span class="app-switch-track" aria-hidden="true">
      <span class="app-switch-thumb" />
    </span>
  </label>
</template>
