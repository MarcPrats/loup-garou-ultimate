(() => {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');
  const playerId = params.get('playerId');

  async function load() {
    if (!gameId || !playerId) throw new Error('Simulation ou joueur manquant');
    const response = await fetch(`/api/test/simulator/game/${encodeURIComponent(gameId)}/player/${encodeURIComponent(playerId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Simulation introuvable');
    window.GameViewRenderers.renderRoleScreen(data.player.role, data.player.bluffRole, data.player.bluffSpecialInfo);
  }

  function init() {
    const rulesButton = document.getElementById('view-rules-btn');
    if (rulesButton) {
      rulesButton.addEventListener('click', () => window.open('/reference.html', '_blank'));
    }
    load().catch((error) => {
      const roleName = document.getElementById('role-name');
      if (roleName) roleName.textContent = error.message;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();