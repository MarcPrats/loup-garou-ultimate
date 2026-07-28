(() => {
  const gameId = new URLSearchParams(window.location.search).get('gameId');

  async function load() {
    if (!gameId) throw new Error('Simulation manquante');
    const response = await fetch(`/api/test/simulator/game/${encodeURIComponent(gameId)}/mj`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Simulation introuvable');
    window.GameViewRenderers.renderGameMasterScreen(data.players);
  }

  function init() {
    const rulesButton = document.getElementById('gm-view-rules-btn');
    if (rulesButton) {
      rulesButton.addEventListener('click', () => window.open('/reference.html', '_blank'));
    }
    load().catch((error) => {
      const table = document.getElementById('gm-players-table');
      if (table) table.innerHTML = `<tr><td colspan="4">${error.message}</td></tr>`;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();