<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
}>(), {
  destructive: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const dialog = ref<HTMLElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null

onMounted(async () => {
  previouslyFocused = document.activeElement as HTMLElement | null
  await nextTick()
  cancelButton.value?.focus()
})

onBeforeUnmount(() => previouslyFocused?.focus())

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('cancel')
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const focusable = [...dialog.value.querySelectorAll<HTMLElement>('button:not([disabled])')]
  if (focusable.length === 0) return
  const first = focusable[0]!
  const last = focusable.at(-1)!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
    @keydown="handleKeydown"
  >
    <section
      ref="dialog"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="`${$attrs.id ?? 'confirm'}-title`"
      :aria-describedby="`${$attrs.id ?? 'confirm'}-description`"
      class="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
    >
      <h2
        :id="`${$attrs.id ?? 'confirm'}-title`"
        class="font-display text-2xl font-bold text-white"
      >
        {{ props.title }}
      </h2>
      <p
        :id="`${$attrs.id ?? 'confirm'}-description`"
        class="mt-3 leading-7 text-slate-300"
      >
        {{ props.description }}
      </p>
      <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          ref="cancelButton"
          type="button"
          class="rounded-xl border border-white/15 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/10"
          @click="emit('cancel')"
        >
          Annuler
        </button>
        <button
          type="button"
          class="rounded-xl px-5 py-3 font-bold text-white transition"
          :class="destructive ? 'bg-red-600 hover:bg-red-500' : 'bg-lgu-orange hover:bg-orange-500'"
          @click="emit('confirm')"
        >
          {{ props.confirmLabel }}
        </button>
      </div>
    </section>
  </div>
</template>
