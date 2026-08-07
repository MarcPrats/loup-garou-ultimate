<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import RulesDistributionTable from '../components/RulesDistributionTable.vue'
import RulesNightBlock from '../components/RulesNightBlock.vue'
import RulesRoleCatalog from '../components/RulesRoleCatalog.vue'
import { ROUTE_NAME } from '../constants/app'
import {
  FIRST_NIGHT_SECTIONS,
  FOLLOWING_NIGHT_SECTIONS,
} from '../constants/rules-page'

const staticMode = import.meta.env.VITE_STATIC_MODE === 'true'
const route = useRoute()
const router = useRouter()

type RulesTab = 'roles' | 'distribution' | 'rules' | 'night'
const RULES_TABS: readonly RulesTab[] = ['roles', 'distribution', 'rules', 'night']
const activeTab = ref<RulesTab>('roles')

function tabFromHash(hash: string): RulesTab | null {
  const tab = hash.replace(/^#/, '') as RulesTab
  return RULES_TABS.includes(tab) ? tab : null
}

async function focusTabPanel(tab: RulesTab): Promise<void> {
  await nextTick()
  const panel = document.getElementById(`rules-panel-${tab}`)
  if (!panel) return

  panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  panel.focus({ preventScroll: true })
}

async function selectTab(tab: RulesTab): Promise<void> {
  activeTab.value = tab
  const hash = `#${tab}`

  if (route.hash !== hash) {
    await router.replace({ hash })
    return
  }
  await focusTabPanel(tab)
}

watch(
  () => route.hash,
  async (hash) => {
    const tab = tabFromHash(hash)
    if (!tab) return
    activeTab.value = tab
    await focusTabPanel(tab)
  },
)

onMounted(async () => {
  document.title = 'Référence — Loup Garou Ultimate'
  const tab = tabFromHash(route.hash)
  if (tab) {
    activeTab.value = tab
    await focusTabPanel(tab)
  }
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
        <RouterLink v-if="!staticMode" :to="{ name: ROUTE_NAME.LOBBIES }" class="rules-back-btn">
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

      <nav class="rules-tabs" role="tablist" aria-label="Sections des règles">
        <button
          id="rules-tab-roles"
          class="rules-tab"
          :class="{ 'rules-tab-active': activeTab === 'roles' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'roles'"
          aria-controls="rules-panel-roles"
          @click="selectTab('roles')"
        >
          <span aria-hidden="true">🎭</span>
          <span>Rôles</span>
        </button>
        <button
          id="rules-tab-distribution"
          class="rules-tab"
          :class="{ 'rules-tab-active': activeTab === 'distribution' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'distribution'"
          aria-controls="rules-panel-distribution"
          @click="selectTab('distribution')"
        >
          <span aria-hidden="true">👥</span>
          <span>Répartition</span>
        </button>
        <button
          id="rules-tab-rules"
          class="rules-tab"
          :class="{ 'rules-tab-active': activeTab === 'rules' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'rules'"
          aria-controls="rules-panel-rules"
          @click="selectTab('rules')"
        >
          <span aria-hidden="true">📜</span>
          <span>Règles</span>
        </button>
        <button
          id="rules-tab-night"
          class="rules-tab"
          :class="{ 'rules-tab-active': activeTab === 'night' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'night'"
          aria-controls="rules-panel-night"
          @click="selectTab('night')"
        >
          <span aria-hidden="true">🌙</span>
          <span>Nuit</span>
        </button>
      </nav>

      <section v-if="activeTab === 'roles'" id="rules-panel-roles" class="rules-tab-panel" tabindex="-1" role="tabpanel" aria-labelledby="rules-tab-roles">
        <RulesRoleCatalog />
      </section>

      <section v-else-if="activeTab === 'distribution'" id="rules-panel-distribution" class="rules-tab-panel" tabindex="-1" role="tabpanel" aria-labelledby="rules-tab-distribution">
        <RulesDistributionTable />
      </section>

      <section v-else-if="activeTab === 'rules'" id="rules-panel-rules" class="rules-tab-panel" tabindex="-1" role="tabpanel" aria-labelledby="rules-tab-rules">
        <section class="rules-overview" aria-labelledby="rules-overview-title">
        <div class="rules-overview-heading">
          <span class="rules-overview-icon" aria-hidden="true"><span class="rules-emoji">📖</span></span>
          <div>
            <p class="rules-overview-kicker">Le principe en un coup d’œil</p>
            <h2 id="rules-overview-title">Comment jouer à Loup Garou Ultimate ?</h2>
          </div>
        </div>

        <div class="rules-overview-grid">
          <article class="rules-overview-card rules-overview-card-village">
            <span class="rules-overview-card-icon" aria-hidden="true"><span class="rules-emoji">🎭</span></span>
            <h3>Un rôle secret</h3>
            <p>Chaque joueur reçoit un personnage et une équipe. Votre identité ne sera révélée qu'à la fin de la partie. Vous être libre de dire ce que vous voulez.</p>
          </article>

          <article class="rules-overview-card rules-overview-card-day">
            <span class="rules-overview-card-icon" aria-hidden="true"><span class="rules-emoji">☀️</span></span>
            <h3>Le jour</h3>
            <p>Discutez, observez les comportements et votez pour éliminer le joueur que vous soupçonnez.</p>
          </article>

          <article class="rules-overview-card rules-overview-card-night">
            <span class="rules-overview-card-icon" aria-hidden="true"><span class="rules-emoji">🌙</span></span>
            <h3>La nuit</h3>
            <p>Le Maître du Jeu réveille les rôles dans l’ordre. Les pouvoirs s’activent et les Loups choisissent leur cible.</p>
          </article>

          <article class="rules-overview-card rules-overview-card-goal">
            <span class="rules-overview-card-icon" aria-hidden="true"><span class="rules-emoji">🏆</span></span>
            <h3>La victoire</h3>
            <p>Le Village doit démasquer tous les Loups tandis que ces derniers doivent rester en vie jusqu'à la fin de la partie.</p>
          </article>
        </div>

        <p class="rules-overview-tip"><span class="rules-emoji" aria-hidden="true">💡</span> Conseil : écoutez les autres, protégez vos informations et n’oubliez jamais qu’un bon bluff peut changer toute la partie.</p>
      </section>

      <section class="rules-practical-rules" aria-labelledby="practical-rules-title">
        <h2 id="practical-rules-title" class="section-title">📜 Les règles essentielles</h2>

        <div class="rules-practical-grid">
          <article class="rules-practical-card rules-practical-card-day">
            <h3><span class="rules-emoji">☀️</span> Pendant la journée</h3>
            <ul>
              <li><span class="rules-emoji">🗳️</span> Tout joueur <b>vivant</b> peut nominer un autre joueur vivant pour une exécution.</li>
              <li><span class="rules-emoji">⚖️</span> Si <b>plus de la moitié des joueurs vivants</b> votent contre une personne nominée, son exécution est validée, <b>mais elle n’est pas réalisée immédiatement.</b></li>
              <li><span class="rules-emoji">📝</span> D’<b>autres</b> nominations peuvent être proposées au cours de la même journée. Un joueur ne peut nominer qu’<b>une seule fois</b> durant la journée.</li>
              <li><span class="rules-emoji">🚫</span> Une personne ne peut <b>être nominée qu’une seule fois</b> durant la journée.</li>
              <li><span class="rules-emoji">🏛️</span> À la fin de la journée, la personne nominée ayant reçu le <b>plus de votes</b> est exécutée.</li>
            </ul>
          </article>

          <article class="rules-practical-card rules-practical-card-ghost">
            <h3><span class="rules-emoji">👻</span> Après une élimination</h3>
            <p><span class="rules-emoji">🕯️</span> Une personne éliminée devient un fantôme. Elle peut <b>continuer à parler</b> et conserve <b>un seul vote</b> pour le reste de la partie. Elle <b>ne peut plus nominer ni être nominée</b>.</p>
          </article>

          <article class="rules-practical-card rules-practical-card-victory">
            <h3><span class="rules-emoji">🏁</span> Conditions de victoire</h3>
            <ul>
              <li><span class="rules-emoji">🏡</span> Le Village gagne lorsqu’il n’y a plus <b>de Loup-garou en vie</b>. Les Villageois et les Marginaux gagnent ensemble.</li>
              <li><span class="rules-emoji">🌲</span> Les Loups-garous gagnent lorsqu’il ne reste plus que <b>deux joueurs vivants</b>.</li>
            </ul>
          </article>

          <article class="rules-practical-card rules-practical-card-night">
            <h3><span class="rules-emoji">🌙</span> Pendant la nuit</h3>
            <p><span class="rules-emoji">🙈</span> Les joueurs peuvent <b>parler pendant la nuit</b>. La seule règle est de <b>garder les yeux fermés</b> lorsque le Maître du Jeu le demande.</p>
          </article>
        </div>
      </section>
      </section>

      <section v-else-if="activeTab === 'night'" id="rules-panel-night" class="rules-tab-panel" tabindex="-1" role="tabpanel" aria-labelledby="rules-tab-night">
        <section aria-labelledby="first-night-title">
        <h2 id="first-night-title" class="section-title">🌑 Ordre de la première nuit</h2>
        <RulesNightBlock title="🌑 Première Nuit" :sections="FIRST_NIGHT_SECTIONS" />
      </section>

      <section aria-labelledby="following-nights-title">
        <h2 id="following-nights-title" class="section-title">🌒 Ordre des nuits suivantes</h2>
        <RulesNightBlock title="🌒 Nuits Suivantes" :sections="FOLLOWING_NIGHT_SECTIONS" />
        </section>
      </section>

      <nav class="rules-back-bar rules-bottom-back" aria-label="Navigation secondaire des règles">
        <RouterLink :to="{ name: ROUTE_NAME.HOME }" class="rules-back-btn">
          🏠 Retour à l'écran principal
        </RouterLink>
        <RouterLink v-if="!staticMode" :to="{ name: ROUTE_NAME.LOBBIES }" class="rules-back-btn">
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

.rules-tab-panel {
  scroll-margin-top: 100px;
}

.rules-tab-panel:focus { outline: none; }
.rules-tab-panel:focus-visible { outline: 2px solid var(--rules-accent); outline-offset: 8px; }

.rules-tabs {
  position: sticky;
  top: 12px;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 26px;
  padding: 8px;
  overflow-x: auto;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 14px;
  background: rgb(26 26 26 / 92%);
  box-shadow: 0 10px 24px rgb(0 0 0 / 18%);
  backdrop-filter: blur(12px);
}

.rules-tab {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--rules-muted);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: .88rem;
  font-weight: 800;
  white-space: nowrap;
  transition: color .2s, background .2s, border-color .2s;
}

.rules-tab:hover { color: #f8f9fa; background: rgb(255 255 255 / 7%); }
.rules-tab:focus-visible { outline: 2px solid var(--rules-accent); outline-offset: 2px; }
.rules-tab-active { color: #fff; border-color: rgb(230 126 34 / 55%); background: linear-gradient(135deg, rgb(230 126 34 / 30%), rgb(52 152 219 / 20%)); }

.rules-overview {
  position: relative;
  margin: 34px 0 8px;
  padding: 24px;
  overflow: hidden;
  border: 1px solid rgb(230 126 34 / 28%);
  border-radius: 18px;
  background:
    radial-gradient(circle at 100% 0%, rgb(52 152 219 / 16%), transparent 38%),
    linear-gradient(145deg, rgb(230 126 34 / 12%), rgb(255 255 255 / 3%));
  box-shadow: 0 16px 34px rgb(0 0 0 / 16%);
}

.rules-overview-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
}

.rules-overview-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgb(230 126 34 / 42%);
  border-radius: 14px;
  background: rgb(230 126 34 / 15%);
  font-size: 1.35rem;
}

.rules-emoji {
  display: inline-block;
  color: #f5b76f;
  filter: drop-shadow(0 0 6px rgb(255 255 255 / 12%));
}

.rules-overview-kicker {
  margin: 0 0 4px;
  color: #f5b76f;
  font-size: .74rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.rules-overview h2 {
  margin: 0;
  color: #f8f9fa;
  font-family: var(--font-display);
  font-size: 1.45rem;
  line-height: 1.2;
}

.rules-overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.rules-overview-card {
  padding: 16px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 14px;
  background: rgb(0 0 0 / 13%);
}

.rules-overview-card-icon { display: block; margin-bottom: 8px; font-size: 1.35rem; }
.rules-overview-card h3 { margin: 0 0 6px; color: #f8f9fa; font-size: 1rem; }
.rules-overview-card p { margin: 0; color: var(--rules-muted); font-size: .86rem; line-height: 1.55; }
.rules-overview-card-village { border-top: 3px solid #27ae60; }
.rules-overview-card-day { border-top: 3px solid #f1c40f; }
.rules-overview-card-night { border-top: 3px solid #3498db; }
.rules-overview-card-goal { border-top: 3px solid #c0392b; }
.rules-overview-card-village .rules-emoji { color: #58d68d; }
.rules-overview-card-day .rules-emoji { color: #f1c40f; }
.rules-overview-card-night .rules-emoji { color: #5dade2; }
.rules-overview-card-goal .rules-emoji { color: #ec7063; }
.rules-overview-card p b,
.rules-overview-tip b {
  color: #f8f9fa;
  font-weight: 700;
}
.rules-overview-card-village p b { color: #58d68d; }
.rules-overview-card-day p b { color: #f1c40f; }
.rules-overview-card-night p b { color: #5dade2; }
.rules-overview-card-goal p b { color: #ec7063; }

.rules-overview-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 18px 0 0;
  padding-top: 16px;
  border-top: 1px solid rgb(255 255 255 / 10%);
  color: #d8dee4;
  font-size: .86rem;
  line-height: 1.5;
}

.rules-practical-rules { margin-top: 34px; }
.rules-practical-rules .section-title { margin-top: 0; }
.rules-practical-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.rules-practical-card { padding: 18px; border: 1px solid rgb(255 255 255 / 10%); border-radius: 14px; background: rgb(255 255 255 / 3%); }
.rules-practical-card h3 { margin: 0 0 12px; color: #f8f9fa; font-size: 1rem; }
.rules-practical-card-ghost h3 { color: #c7d2d9; }
.rules-practical-card p,
.rules-practical-card li { color: var(--rules-muted); font-size: .86rem; line-height: 1.55; }
.rules-practical-card p { margin: 0; }
.rules-practical-card ul { display: grid; gap: 9px; margin: 0; padding-left: 20px; }
.rules-practical-card li::marker { color: var(--rules-accent); }
.rules-practical-card-day { border-top: 3px solid #f1c40f; }
.rules-practical-card-ghost { border-top: 3px solid #95a5a6; }
.rules-practical-card-victory { border-top: 3px solid #27ae60; }
.rules-practical-card-night { border-top: 3px solid #3498db; }
.rules-practical-card-day .rules-emoji { color: #f1c40f; }
.rules-practical-card-ghost .rules-emoji { color: #c7d2d9; }
.rules-practical-card-victory .rules-emoji { color: #58d68d; }
.rules-practical-card-night .rules-emoji { color: #5dade2; }
.rules-practical-card p b,
.rules-practical-card li b {
  color: #f8f9fa;
  font-weight: 700;
}
.rules-practical-card-day p b,
.rules-practical-card-day li b { color: #f1c40f; }
.rules-practical-card-ghost p b,
.rules-practical-card-ghost li b { color: #c7d2d9; }
.rules-practical-card-victory p b,
.rules-practical-card-victory li b { color: #58d68d; }
.rules-practical-card-night p b,
.rules-practical-card-night li b { color: #5dade2; }

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
  .rules-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    margin: 0 0 22px;
    padding: 6px;
    overflow: visible;
  }
  .rules-tab { min-height: 50px; padding: 10px 8px; }
  .rules-overview { padding: 18px; }
  .rules-overview-grid { grid-template-columns: 1fr; }
  .rules-overview h2 { font-size: 1.25rem; }
  .rules-practical-grid { grid-template-columns: 1fr; }
}

</style>
