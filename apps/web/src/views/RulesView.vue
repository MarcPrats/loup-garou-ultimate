<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import RulesDistributionTable from '../components/RulesDistributionTable.vue'
import RulesNightBlock from '../components/RulesNightBlock.vue'
import RulesRoleCatalog from '../components/RulesRoleCatalog.vue'
import { ROUTE_NAME } from '../constants/app'
import {
  FIRST_NIGHT_SECTIONS,
  FOLLOWING_NIGHT_SECTIONS,
} from '../constants/rules-page'

const staticMode = import.meta.env.VITE_STATIC_MODE === 'true'

onMounted(() => {
  document.title = 'Référence — Loup Garou Ultimate'
})

onBeforeUnmount(() => {
  document.title = 'Loup Garou Ultime'
})
</script>

<template>
  <main class="rules-page">
    <div class="rules-shell">
      <nav class="rules-back-bar" aria-label="Navigation des règles">
        <RouterLink :to="{ name: ROUTE_NAME.HOME }" class="rules-back-btn">
          🏠 Retour à l'écran principal
        </RouterLink>
        <RouterLink v-if="!staticMode" :to="{ name: ROUTE_NAME.ENTRY }" class="rules-back-btn">
          🚪 Retour à la salle d'attente
        </RouterLink>
        <span v-else class="rules-back-btn rules-back-btn-disabled" aria-disabled="true">
          🚪 Retour à la salle d'attente
        </span>
      </nav>

      <header class="rules-header">
        <h1>🐺 Loup Garou Ultimate</h1>
        <p>Fiche de référence — Personnages, répartition &amp; ordre des nuits</p>
      </header>

      <RulesRoleCatalog />
      <RulesDistributionTable />

      <section aria-labelledby="first-night-title">
        <h2 id="first-night-title" class="section-title">🌑 Ordre de la première nuit</h2>
        <RulesNightBlock title="🌑 Première Nuit" :sections="FIRST_NIGHT_SECTIONS" />
      </section>

      <section aria-labelledby="following-nights-title">
        <h2 id="following-nights-title" class="section-title">🌒 Ordre des nuits suivantes</h2>
        <RulesNightBlock title="🌒 Nuits Suivantes" :sections="FOLLOWING_NIGHT_SECTIONS" />
      </section>

      <nav class="rules-back-bar rules-bottom-back" aria-label="Navigation secondaire des règles">
        <RouterLink :to="{ name: ROUTE_NAME.HOME }" class="rules-back-btn">
          🏠 Retour à l'écran principal
        </RouterLink>
        <RouterLink v-if="!staticMode" :to="{ name: ROUTE_NAME.ENTRY }" class="rules-back-btn">
          🚪 Retour à la salle d'attente
        </RouterLink>
        <span v-else class="rules-back-btn rules-back-btn-disabled" aria-disabled="true">
          🚪 Retour à la salle d'attente
        </span>
      </nav>
    </div>
  </main>
</template>

<style>
.rules-page {
  --rules-bg: #1a1a1a;
  --rules-bg-secondary: #2d2d2d;
  --rules-accent: #e67e22;
  --rules-blue: #3498db;
  --rules-muted: #adb5bd;
  --rules-border: #495057;
  min-height: 100vh;
  padding: 20px;
  color: #f8f9fa;
  background: linear-gradient(135deg, var(--rules-bg) 0%, var(--rules-bg-secondary) 100%);
}

.rules-shell {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.rules-back-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 28px;
}

.rules-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: 1px solid var(--rules-border);
  border-radius: 10px;
  color: #f8f9fa;
  background: rgb(255 255 255 / 7%);
  font-size: .9rem;
  font-weight: 500;
  text-decoration: none;
  transition: background .2s;
}

.rules-back-btn:hover,
.rules-back-btn:focus-visible {
  background: rgb(255 255 255 / 13%);
}

.rules-back-btn-disabled {
  cursor: not-allowed;
  opacity: .45;
  pointer-events: none;
}

.rules-header {
  padding: 10px 0 36px;
  margin-bottom: 36px;
  border-bottom: 1px solid var(--rules-border);
  text-align: center;
}

.rules-header h1 {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 2.2rem;
  background: linear-gradient(135deg, var(--rules-accent), var(--rules-blue));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.rules-header p {
  margin: 0;
  color: var(--rules-muted);
  font-size: .95rem;
}

.rules-page .catalogue-title {
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-size: 1.5rem;
}

.rules-page .section-title {
  margin: 40px 0 18px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--rules-border);
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 1.4rem;
}

.rules-page .section-title.townsfolk,
.rules-page .section-title.villageois { border-color: #27ae60; }
.rules-page .section-title.outsiders,
.rules-page .section-title.marginal { border-color: #3498db; }
.rules-page .section-title.minions,
.rules-page .section-title.loup-garou { border-color: #8e44ad; }
.rules-page .section-title.demons,
.rules-page .section-title.loup-garou-ultime { border-color: #c0392b; }

.distribution-section {
  padding: 0 16px 4px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 16px;
  background: linear-gradient(145deg, rgb(255 255 255 / 5%), rgb(255 255 255 / 2%));
  box-shadow: 0 12px 30px rgb(0 0 0 / 14%);
}

.distribution-section > .section-title { margin-top: 18px; }
.distribution-table-desktop { display: block; }
.distribution-cards { display: none; }

.count-table {
  width: 100%;
  margin-bottom: 14px;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid var(--rules-border);
  border-radius: 12px;
  overflow: hidden;
  background: rgb(255 255 255 / 3%);
}

.count-table th,
.count-table td {
  padding: 12px 10px;
  border-right: 1px solid var(--rules-border);
  border-bottom: 1px solid var(--rules-border);
  font-size: .84rem;
  text-align: center;
}

.count-table th:last-child,
.count-table td:last-child { border-right: 0; }
.count-table tbody tr:last-child td { border-bottom: 0; }

.count-table thead th {
  color: #f8f9fa;
  background: rgb(255 255 255 / 8%);
  font-size: .72rem;
  font-weight: 800;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.count-table thead .distribution-heading-total { color: #f39c12; background: rgb(243 156 18 / 15%); }
.count-table thead .distribution-heading-villagers { color: #58d68d; background: rgb(39 174 96 / 15%); }
.count-table thead .distribution-heading-outsiders { color: #5dade2; background: rgb(52 152 219 / 15%); }
.count-table thead .distribution-heading-werewolves { color: #ec7063; background: rgb(192 57 43 / 15%); }
.count-table thead .distribution-heading-ultimate { color: #d7bde2; background: rgb(142 68 173 / 18%); }

.count-table tbody tr:nth-child(even) { background: rgb(255 255 255 / 2%); }
.count-table tbody tr:hover { background: rgb(255 255 255 / 6%); }
.count-table td:first-child { color: #f8f9fa; font-weight: 800; }

.distribution-number {
  display: inline-flex;
  min-width: 2rem;
  min-height: 2rem;
  align-items: center;
  justify-content: center;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: .92rem;
  font-weight: 800;
  line-height: 1;
}

.distribution-number-total { color: #ffd28a; background: rgb(243 156 18 / 20%); }
.distribution-number-villagers { color: #a9f5c7; background: rgb(39 174 96 / 20%); }
.distribution-number-outsiders { color: #b9e3ff; background: rgb(52 152 219 / 20%); }
.distribution-number-werewolves { color: #ffc1ba; background: rgb(192 57 43 / 20%); }
.distribution-number-ultimate { color: #efd7f7; background: rgb(142 68 173 / 24%); }

.distribution-card {
  padding: 14px;
  border: 1px solid var(--rules-border);
  border-radius: 14px;
  background: rgb(255 255 255 / 4%);
}

.distribution-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid rgb(255 255 255 / 10%);
}

.distribution-players { color: #f8f9fa; font-size: 1rem; font-weight: 800; }
.distribution-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding-top: 12px; }
.distribution-metric { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 10px; border-radius: 10px; font-size: .76rem; font-weight: 700; }
.distribution-metric span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.distribution-metric strong { font-size: 1rem; }
.distribution-metric-villagers { color: #a9f5c7; background: rgb(39 174 96 / 15%); }
.distribution-metric-outsiders { color: #b9e3ff; background: rgb(52 152 219 / 15%); }
.distribution-metric-werewolves { color: #ffc1ba; background: rgb(192 57 43 / 15%); }
.distribution-metric-ultimate { color: #efd7f7; background: rgb(142 68 173 / 18%); }

.footnote {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 14px 0 24px;
  color: var(--rules-muted);
  font-size: .75rem;
  font-style: italic;
  line-height: 1.5;
}

.footnote span { flex: 0 0 auto; font-style: normal; }

.night-block {
  margin-bottom: 30px;
  overflow: hidden;
  border: 1px solid var(--rules-border);
  border-radius: 10px;
  background: rgb(255 255 255 / 3%);
}

.night-block-header {
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgb(52 73 94 / 55%);
  font-family: var(--font-display);
  font-size: 1.1rem;
}

.night-separator {
  padding: 7px 20px;
  border-top: 1px solid rgb(255 255 255 / 5%);
  color: var(--rules-accent);
  background: rgb(230 126 34 / 10%);
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.night-step {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 20px;
  border-top: 1px solid rgb(255 255 255 / 5%);
  transition: background .15s;
}

.night-step:hover { background: rgb(255 255 255 / 4%); }

.night-step-icon,
.night-step-emoji {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 7px;
}

.night-step-icon { object-fit: cover; }

.night-step-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(255 255 255 / 6%);
  font-size: 1.4rem;
}

.night-step-body { flex: 1; }
.night-step-body strong { display: block; margin-bottom: 3px; font-size: .88rem; }
.night-step-body > span { display: block; color: var(--rules-muted); font-size: .78rem; line-height: 1.5; }
.night-step-body .eye { color: var(--rules-blue); }
.night-cond { margin-bottom: 2px; color: var(--rules-accent) !important; font-size: .73rem !important; font-weight: 600; }

.rules-bottom-back {
  order: 8;
  margin-top: 30px;
}

@media (max-width: 600px) {
  .rules-page { padding: 12px; }
  .rules-page .roles-grid { grid-template-columns: 1fr; }
  .rules-header h1 { font-size: 1.7rem; }
  .night-step { padding: 12px 14px; }
  .night-separator,
  .night-block-header { padding-left: 14px; padding-right: 14px; }
  .distribution-section { padding: 0 10px 2px; }
  .distribution-table-desktop { display: none; }
  .distribution-cards { display: grid; gap: 10px; }
}
</style>
