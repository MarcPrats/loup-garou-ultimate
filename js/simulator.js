(() => {
  const $ = (selector) => document.querySelector(selector);
  let currentGame = null;

  function setStatus(message, isError = false) {
    const element = $('#status');
    element.textContent = message || '';
    element.classList.toggle('error', isError);
  }

  async function request(path, options = {}) {
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  }

  function openMjView() {
    if (!currentGame) return;
    window.open(`/dev/simulator/mj?gameId=${encodeURIComponent(currentGame.id)}`, '_blank', 'noopener');
  }

  function openPlayerView(playerId) {
    if (!currentGame) return;
    window.open(`/dev/simulator/player?gameId=${encodeURIComponent(currentGame.id)}&playerId=${encodeURIComponent(playerId)}`, '_blank', 'noopener');
  }

  function renderGame(game) {
    currentGame = game;
    $('#game-panel').hidden = false;
    $('#game-summary').textContent = `${game.playerCount} joueurs hors MJ, outsider prévu : ${game.outsiderSummary}.`;
    $('#player-list').innerHTML = game.players.map((player) => `
      <div class="player-row">
        <div class="player-identity">
          ${player.role?.image ? `<img class="role-thumb" src="/images/${encodeURIComponent(player.role.image)}" alt="">` : ''}
          <span><strong>${player.name}</strong><small>${player.role?.name || 'Rôle indisponible'} · ${player.type || 'type indisponible'}</small></span>
        </div>
        <button data-player-view="${player.playerId}">👤 Vue joueur</button>
      </div>
    `).join('');
  }

  async function createGame() {
    try {
      setStatus('Création de la simulation…');
      const payload = await request('/api/test/simulator/game', {
        method: 'POST',
        body: JSON.stringify({ playerCount: Number($('#player-count').value) })
      });
      renderGame(payload.game);
      setStatus('Simulation créée.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function reset() {
    try {
      await request('/api/test/simulator/reset', { method: 'POST', body: '{}' });
      currentGame = null;
      $('#game-panel').hidden = true;
      setStatus('Simulateur réinitialisé.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  $('#simulate-btn').addEventListener('click', createGame);
  $('#mj-btn').addEventListener('click', openMjView);
  $('#reset-btn').addEventListener('click', reset);
  $('#player-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-player-view]');
    if (button) openPlayerView(button.dataset.playerView);
  });

  request('/api/test/simulator/state')
    .then((payload) => {
      if (payload.game) renderGame(payload.game);
      setStatus('Simulateur prêt.');
    })
    .catch((error) => setStatus(error.message, true));
})();