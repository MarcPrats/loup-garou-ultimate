<script setup lang="ts">
import { computed } from 'vue'

import '../../../../css/role-catalog.css'

import RulesRoleCard from './RulesRoleCard.vue'
import {
  RULES_ROLE_CATALOG,
  RULES_ROLE_CATEGORIES,
} from '../constants/rules-page'

const groups = computed(() => RULES_ROLE_CATEGORIES.map((category) => ({
  ...category,
  roles: RULES_ROLE_CATALOG
    .filter((role) => role.category === category.id)
    .sort((left, right) => Number(right.available) - Number(left.available)),
})).filter((category) => category.roles.length > 0))
</script>

<template>
  <section class="roles-section" aria-labelledby="characters-title">
    <h2 id="characters-title" class="catalogue-title">🎭 Personnages</h2>
    <div id="roles-catalog" class="roles-catalog">
      <section v-for="group in groups" :key="group.id" class="role-category">
        <h2 class="section-title" :class="group.id">
          <span aria-hidden="true">{{ group.emoji }}</span> {{ group.label }}
        </h2>
        <div class="roles-grid">
          <RulesRoleCard v-for="role in group.roles" :key="role.id" :role="role" />
        </div>
      </section>
    </div>
  </section>
</template>
