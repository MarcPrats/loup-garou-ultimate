(() => {
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
  }

  function roleTeamLabel(role) {
    return role?.team === 'werewolves' ? '🐺 Loup-Garou' : '👥 Villageois';
  }

  function imagePath(role) {
    return role?.image ? `/images/${encodeURIComponent(role.image)}` : '';
  }

  function renderRoleScreen(role, bluffRole = null, bluffSpecialInfo = null) {
    document.getElementById('role-image').src = imagePath(role);
    document.getElementById('role-image').alt = role.name;
    document.getElementById('role-name').textContent = role.name;
    const teamBadge = document.getElementById('role-team');
    teamBadge.textContent = roleTeamLabel(role);
    teamBadge.className = `role-team-badge team-${role.team}`;
    document.getElementById('role-power').textContent = role.power || '---';
    document.getElementById('role-info').textContent = role.info || '---';

    const bluffSection = document.getElementById('bluff-role-section');
    if (bluffRole && role.team === 'werewolves') {
      bluffSection.style.display = 'block';
      document.getElementById('bluff-role-image').src = imagePath(bluffRole);
      document.getElementById('bluff-role-image').alt = bluffRole.name;
      document.getElementById('bluff-role-name').textContent = bluffRole.name;
      document.getElementById('bluff-role-power').textContent = bluffRole.power || '---';
      document.getElementById('bluff-role-info').textContent = bluffRole.info || '---';
    } else {
      bluffSection.style.display = 'none';
    }

    const specialSection = document.getElementById('bluff-special-info-section');
    if (bluffSpecialInfo && role.team === 'werewolves') {
      specialSection.style.display = 'block';
      const content = document.getElementById('bluff-special-info-content');
      const roleName = escapeHtml(bluffSpecialInfo.role?.name || '---');
      const players = (bluffSpecialInfo.twoPlayerNames || []).map(escapeHtml).join(', ');
      const label = bluffSpecialInfo.type === 'renard' ? '🦊 Info Renard (Bluff)' : '👧 Info Petite Fille (Bluff)';
      content.innerHTML = `<strong>${label}</strong><br>Rôle : ${roleName}<br>Joueurs : ${players}`;
    } else {
      specialSection.style.display = 'none';
    }
  }

  function renderGameMasterScreen(players) {
    const tableBody = document.getElementById('gm-players-table');
    tableBody.innerHTML = '';
    document.getElementById('gm-total-players').textContent = players.length;
    document.getElementById('gm-werewolf-count').textContent = players.filter(player => player.role?.team === 'werewolves').length;
    document.getElementById('gm-villager-count').textContent = players.filter(player => player.role?.team === 'villagers').length;

    players.forEach((player) => {
      const row = document.createElement('tr');
      const details = [];
      if (player.isDrunk) details.push('<span class="drunk-badge">🍺 Bourré</span>');
      if (player.renardDetails) details.push(`<div class="sim-detail">🦊 Info Renard<br>Loup : ${escapeHtml(player.renardDetails.werewolfRole.name)}<br>Joueurs : ${player.renardDetails.twoPlayerNames.map(escapeHtml).join(', ')}</div>`);
      if (player.petiteFilleDetails) details.push(`<div class="sim-detail">👧 Info Petite Fille<br>Villageois : ${escapeHtml(player.petiteFilleDetails.villagerRole.name)}<br>Joueurs : ${player.petiteFilleDetails.twoPlayerNames.map(escapeHtml).join(', ')}</div>`);
      if (player.bluffRole) details.push(`<div class="sim-detail">🎭 Rôle Bluff<br>${escapeHtml(player.bluffRole.name)}</div>`);
      if (player.voyanteDecoy) details.push(`<div class="sim-detail">🔮 Leurre Voyante<br>${escapeHtml(player.voyanteDecoy)}</div>`);
      const roleImage = player.role?.image ? `<img class="gm-role-image" src="${imagePath(player.role)}" alt="">` : '';
      row.innerHTML = `
        <td><div class="gm-player-name">${escapeHtml(player.playerName)}</div></td>
        <td><div class="gm-role-name">${roleImage}<span>${escapeHtml(player.role?.name)}</span></div></td>
        <td><span class="gm-team-badge team-${player.role?.team}">${roleTeamLabel(player.role)}</span></td>
        <td><div class="sim-details">${details.join('') || 'Aucune information supplémentaire'}</div></td>`;
      tableBody.appendChild(row);
    });
  }

  window.SimulatorViews = { renderRoleScreen, renderGameMasterScreen };
})();