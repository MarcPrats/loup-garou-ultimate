<script setup lang="ts">
import { computed } from 'vue'

import type { HostDashboard } from '@lgu/contracts'

import {
  FIRST_NIGHT_SECTIONS,
  FOLLOWING_NIGHT_SECTIONS,
  filterRulesNightSections,
} from '../constants/rules-page'
import RulesNightBlock from './RulesNightBlock.vue'

const props = defineProps<{
  dashboard: HostDashboard
}>()

const presentRoleIds = computed(() => props.dashboard.players.map((assignment) => assignment.role.id))
const firstNightSections = computed(() => filterRulesNightSections(
  FIRST_NIGHT_SECTIONS,
  presentRoleIds.value,
  props.dashboard.playerCount,
))
const followingNightSections = computed(() => filterRulesNightSections(
  FOLLOWING_NIGHT_SECTIONS,
  presentRoleIds.value,
  props.dashboard.playerCount,
))
</script>

<template>
  <section class="app-gm-night-order" aria-labelledby="gm-night-order-title">
    <header class="app-gm-night-order-header">
      <h2 id="gm-night-order-title">🌙 Ordre des nuits</h2>
      <p>Seuls les rôles présents dans cette partie sont affichés.</p>
    </header>

    <div class="app-gm-night-order-grid">
      <div>
        <RulesNightBlock title="🌑 Première Nuit" :sections="firstNightSections" />
      </div>
      <div>
        <RulesNightBlock title="🌒 Nuits Suivantes" :sections="followingNightSections" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.app-gm-night-order {
  margin-top: 30px;
  padding: 22px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: rgb(255 255 255 / 4%);
}

.app-gm-night-order-header { margin-bottom: 20px; text-align: center; }
.app-gm-night-order-header h2 { margin-bottom: 6px; }
.app-gm-night-order-header p { color: var(--app-muted); font-size: .88rem; }
.app-gm-night-order-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.app-gm-night-order-grid h3 { margin: 0 0 10px; color: var(--app-text); font-size: 1rem; }
.app-gm-night-order :deep(.night-block) { margin-bottom: 0; overflow: hidden; border: 1px solid var(--app-border); border-radius: 10px; background: rgb(255 255 255 / 3%); }
.app-gm-night-order :deep(.night-block-header) { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: rgb(52 73 94 / 55%); font-family: var(--font-display); font-size: 1rem; }
.app-gm-night-order :deep(.night-separator) { padding: 7px 16px; border-top: 1px solid rgb(255 255 255 / 5%); color: var(--app-accent); background: rgb(230 126 34 / 10%); font-size: .68rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
.app-gm-night-order :deep(.night-step) { display: flex; align-items: flex-start; gap: 10px; padding: 11px 16px; border-top: 1px solid rgb(255 255 255 / 5%); }
.app-gm-night-order :deep(.night-step-icon),
.app-gm-night-order :deep(.night-step-emoji) { width: 36px; height: 36px; flex: 0 0 36px; border-radius: 7px; }
.app-gm-night-order :deep(.night-step-icon) { object-fit: cover; }
.app-gm-night-order :deep(.night-step-emoji) { display: flex; align-items: center; justify-content: center; background: rgb(255 255 255 / 6%); font-size: 1.2rem; }
.app-gm-night-order :deep(.night-step-body) { flex: 1; }
.app-gm-night-order :deep(.night-step-body strong) { display: block; margin-bottom: 3px; font-size: .82rem; }
.app-gm-night-order :deep(.night-step-body > span) { display: block; color: var(--app-muted); font-size: .72rem; line-height: 1.45; }
.app-gm-night-order :deep(.night-step-body .eye) { color: var(--app-blue); }
.app-gm-night-order :deep(.night-cond) { margin-bottom: 2px; color: var(--app-accent) !important; font-size: .7rem !important; font-weight: 600; }

@media (max-width: 760px) {
  .app-gm-night-order { padding: 16px; }
  .app-gm-night-order-grid { grid-template-columns: 1fr; }
}
</style>
