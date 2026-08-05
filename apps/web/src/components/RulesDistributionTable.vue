<script setup lang="ts">
import { RULES_DISTRIBUTION } from '../constants/rules-page'
</script>

<template>
  <section aria-labelledby="distribution-title">
    <h2 id="distribution-title" class="section-title">📊 Répartition des personnages</h2>
    <table class="count-table">
      <thead>
        <tr>
          <th>Joueurs</th>
          <th>Total</th>
          <th>👥 Villageois</th>
          <th>🌀 Marginaux</th>
          <th>😈 Loups</th>
          <th>🐺 Loup Ultime</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in RULES_DISTRIBUTION" :key="row.players">
          <td>{{ row.players }}</td>
          <td>{{ row.players }}</td>
          <td>{{ row.villagers }}</td>
          <td>{{ row.outsiders }}</td>
          <td>{{ row.werewolves }}</td>
          <td>{{ row.ultimateWerewolf }}</td>
        </tr>
      </tbody>
    </table>
    <p class="footnote">Note : avec le Baron en jeu, ajoutez 2 Marginaux au compte (retirez 2 Villageois en conséquence).</p>
  </section>
</template>
