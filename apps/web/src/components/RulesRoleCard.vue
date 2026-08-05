<script setup lang="ts">
import type { RulesRoleCatalogEntry } from '../constants/rules-page'

defineProps<{ role: RulesRoleCatalogEntry }>()
</script>

<template>
  <a
    v-if="role.available"
    class="role-card role-card-link"
    :class="role.category"
    :href="`/role.html?role=${encodeURIComponent(role.id)}`"
    :aria-label="`Voir les détails de ${role.name}`"
  >
    <img v-if="role.imagePath" class="role-icon" :src="role.imagePath" :alt="role.name">
    <div v-else class="role-icon-placeholder" aria-hidden="true">{{ role.emoji ?? '❔' }}</div>
    <div class="role-body">
      <span class="role-badge" :class="role.category">{{ role.categoryLabel }}</span>
      <h3>{{ role.name }}</h3>
      <p>{{ role.summary }}</p>
      <span class="role-card-cta">Voir le personnage →</span>
    </div>
  </a>

  <article
    v-else
    class="role-card role-card-coming-soon"
    :class="role.category"
    :aria-label="`${role.name}, bientôt disponible`"
  >
    <img v-if="role.imagePath" class="role-icon" :src="role.imagePath" :alt="role.name">
    <div v-else class="role-icon-placeholder" aria-hidden="true">{{ role.emoji ?? '❔' }}</div>
    <div class="role-body">
      <span class="role-badge" :class="role.category">{{ role.categoryLabel }}</span>
      <h3>{{ role.name }}</h3>
      <p>{{ role.summary }}</p>
      <span class="coming-soon-label">Bientôt disponible</span>
    </div>
  </article>
</template>
