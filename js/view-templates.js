(() => {
  const templates = {
    roleScreen: `
            <div class="role-reveal">
                <h2>Votre Rôle</h2>
                <div class="role-card">
                    <div class="role-image-container">
                        <img id="role-image" src="" alt="Votre rôle">
                    </div>
                    <div class="role-info">
                        <h3 id="role-name" class="role-title">---</h3>
                        <span id="role-team" class="role-team-badge">---</span>
                    </div>
                </div>

                <div class="role-description-container">
                    <div class="description-section power-section">
                        <div class="section-header">
                            <span class="section-icon">⚡</span>
                            <h4>Votre Pouvoir</h4>
                        </div>
                        <p id="role-power" class="section-text">---</p>
                    </div>

                    <div class="description-section info-section">
                        <div class="section-header">
                            <span class="section-icon">💡</span>
                            <h4>Autres Infos</h4>
                        </div>
                        <p id="role-info" class="section-text">---</p>
                    </div>
                </div>

                <!-- Bluff Role Section (only for werewolves) -->
                <div id="bluff-role-section" class="role-description-container"
                    style="display: none; margin-top: 20px;">
                    <h3
                        style="text-align: center; margin-bottom: 15px; color: #ff6f00; font-weight: bold;">
                        🎭
                        Votre Rôle de Couverture</h3>
                    <div class="role-card">
                        <div class="role-image-container">
                            <img id="bluff-role-image" src="" alt="Rôle bluff">
                        </div>
                        <div class="role-info">
                            <h4 id="bluff-role-name">---</h4>
                        </div>
                    </div>
                    <div class="description-section power-section">
                        <div class="section-header">
                            <span class="section-icon">⚡</span>
                            <h4>Pouvoir (Bluff)</h4>
                        </div>
                        <p id="bluff-role-power" class="section-text">---</p>
                    </div>
                    <div class="description-section info-section">
                        <div class="section-header">
                            <span class="section-icon">💡</span>
                            <h4>Infos (Bluff)</h4>
                        </div>
                        <p id="bluff-role-info" class="section-text">---</p>
                    </div>
                </div>

                <!-- Bluff Special Info Section (for werewolves with renard/petite-fille bluff) -->
                <div id="bluff-special-info-section" class="role-description-container"
                    style="display: none; margin-top: 20px;">
                    <h3
                        style="text-align: center; margin-bottom: 15px; color: #9c27b0; font-weight: bold;">
                        🔍
                        Informations du rôle de couverture (Bluff)</h3>
                    <div class="description-section">
                        <div class="section-header">
                            <span class="section-icon">🎭</span>
                            <h4>Ce que vous devriez savoir</h4>
                        </div>
                        <div id="bluff-special-info-content" class="section-text"></div>
                    </div>
                </div>

                <button id="view-rules-btn" class="btn btn-secondary" style="margin-top: 20px;">
                    📖 Consulter les Règles
                </button>
            </div>
        `,
    gameMasterScreen: `
            <div class="gm-header">
                <h2>👑 Maître du Jeu</h2>
                <p class="subtitle">Vue d'ensemble de tous les rôles</p>

                <div class="gm-stats">
                    <span class="gm-stat">🎮 <span id="gm-total-players">0</span> Joueurs</span>
                </div>

                <div class="gm-team-counts">
                    <span class="gm-team-stat werewolf">🐺 <span id="gm-werewolf-count">0</span>
                        Loups-Garous</span>
                    <span class="gm-team-stat villager">👥 <span id="gm-villager-count">0</span>
                        Villageois</span>
                </div>
            </div>

            <div class="gm-players-container">
                <table class="gm-players-table">
                    <thead>
                        <tr>
                            <th>Joueur</th>
                            <th>Rôle</th>
                            <th>Équipe</th>
                            <th>Détails</th>
                        </tr>
                    </thead>
                    <tbody id="gm-players-table">
                        <!-- Players will be populated dynamically -->
                    </tbody>
                </table>
            </div>

            <button id="gm-view-rules-btn" class="btn btn-secondary" style="margin-top: 20px;">
                📖 Consulter les Règles
            </button>
        `
  };

  function mount() {
    const roleScreen = document.getElementById('role-screen');
    const gameMasterScreen = document.getElementById('game-master-screen');
    if (roleScreen && !roleScreen.dataset.templateMounted) {
      roleScreen.innerHTML = templates.roleScreen;
      roleScreen.dataset.templateMounted = 'true';
    }
    if (gameMasterScreen && !gameMasterScreen.dataset.templateMounted) {
      gameMasterScreen.innerHTML = templates.gameMasterScreen;
      gameMasterScreen.dataset.templateMounted = 'true';
    }
  }

  templates.mount = mount;
  window.GameViewTemplates = templates;
  // All pages load this script after the view placeholders, so mount now.
  // This also guarantees that the following page script can find its buttons.
  mount();
})();