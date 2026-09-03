<script setup lang="ts">
const modelValue = defineModel<string>({ default: '' })

const props = withDefaults(defineProps<{
  type?: 'text' | 'email' | 'password' | 'search' | 'url'
  disabled?: boolean
  readonly?: boolean
  displayValue?: string
}>(), {
  type: 'text',
  disabled: false,
  readonly: false,
})

function updateValue(event: Event): void {
  if (props.displayValue !== undefined) return
  const input = event.target
  if (input instanceof HTMLInputElement) modelValue.value = input.value
}
</script>

<template>
  <input
    :value="displayValue ?? modelValue"
    class="app-control app-input"
    :type="type"
    :disabled="disabled"
    :readonly="readonly"
    @input="updateValue"
  >
</template>
