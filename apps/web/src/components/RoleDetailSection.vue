<script setup lang="ts">
withDefaults(defineProps<{
    title: string
    icon: string
}>(), {
    icon: '⚡',
})
</script>

<template>
    <section class="app-description-section"
        :class="{ 'app-power-section': icon === '⚡', 'app-info-section': icon === '💡' }">
        <div class="app-section-header">
            <span class="app-section-icon">{{ icon }}</span>
            <h4>{{ title }}</h4>
        </div>
        <div class="app-role-paragraphs">
            <slot />
        </div>
    </section>
</template>
