<script setup lang="ts">
import { RULES_DISTRIBUTION } from '../constants/rules-page'
</script>

<template>
  <section class="distribution-section" aria-labelledby="distribution-title">
    <h2 id="distribution-title" class="section-title">📊 Répartition des personnages</h2>

    <div class="distribution-table-desktop">
      <table class="count-table">
        <thead>
          <tr>
            <th>Joueurs</th>
            <th class="distribution-heading-total">Total</th>
            <th class="distribution-heading-villagers">👥 Villageois</th>
            <th class="distribution-heading-outsiders">🌀 Marginaux</th>
            <th class="distribution-heading-werewolves">😈 Loups</th>
            <th class="distribution-heading-ultimate">🐺 Loup Ultime</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in RULES_DISTRIBUTION" :key="row.players">
            <td>{{ row.players }}</td>
            <td><span class="distribution-number distribution-number-total">{{ row.players }}</span></td>
            <td><span class="distribution-number distribution-number-villagers">{{ row.villagers }}</span></td>
            <td><span class="distribution-number distribution-number-outsiders">{{ row.outsiders }}</span></td>
            <td><span class="distribution-number distribution-number-werewolves">{{ row.werewolves }}</span></td>
            <td><span class="distribution-number distribution-number-ultimate">{{ row.ultimateWerewolf }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="distribution-cards" aria-label="Répartition détaillée par nombre de joueurs">
      <article v-for="row in RULES_DISTRIBUTION" :key="`mobile-${row.players}`" class="distribution-card">
        <header class="distribution-card-header">
          <span class="distribution-players">{{ row.players }} joueurs</span>
          <span class="distribution-number distribution-number-total">{{ row.players }}</span>
        </header>
        <div class="distribution-metrics">
          <div class="distribution-metric distribution-metric-villagers">
            <span>👥 Villageois</span>
            <strong>{{ row.villagers }}</strong>
          </div>
          <div class="distribution-metric distribution-metric-outsiders">
            <span>🌀 Marginaux</span>
            <strong>{{ row.outsiders }}</strong>
          </div>
          <div class="distribution-metric distribution-metric-werewolves">
            <span>😈 Loups</span>
            <strong>{{ row.werewolves }}</strong>
          </div>
          <div class="distribution-metric distribution-metric-ultimate">
            <span>🐺 Loup Ultime</span>
            <strong>{{ row.ultimateWerewolf }}</strong>
          </div>
        </div>
      </article>
    </div>

    <p class="footnote"><span aria-hidden="true">💡</span> Note : avec le Baron en jeu, ajoutez 2 Marginaux au compte (retirez 2 Villageois en conséquence).</p>
  </section>
</template>
