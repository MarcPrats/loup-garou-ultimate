(() => {
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
  }

  function renderGameMasterScreen(players) {
    const tableBody = document.getElementById('gm-players-table');
    tableBody.innerHTML = '';

    let werewolfCount = 0;
    let villagerCount = 0;
    players.forEach(player => {
      if (player.role.team === 'werewolves') werewolfCount++;
      else if (player.role.team === 'villagers') villagerCount++;
    });

    document.getElementById('gm-total-players').textContent = players.length;
    document.getElementById('gm-werewolf-count').textContent = werewolfCount;
    document.getElementById('gm-villager-count').textContent = villagerCount;

    players.forEach(player => {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      const namePara = document.createElement('div');
      namePara.className = `gm-player-name${player.isHost ? ' host' : ''}`;

      if (player.token) {
        const nameLink = document.createElement('a');
        nameLink.href = `${window.location.pathname}?token=${player.token}`;
        nameLink.textContent = player.playerName;
        nameLink.target = '_blank';
        nameLink.style.color = 'inherit';
        nameLink.style.textDecoration = 'none';
        nameLink.style.cursor = 'pointer';
        nameLink.addEventListener('mouseover', () => { nameLink.style.textDecoration = 'underline'; });
        nameLink.addEventListener('mouseout', () => { nameLink.style.textDecoration = 'none'; });
        namePara.appendChild(nameLink);
      } else {
        namePara.textContent = player.playerName;
      }
      nameCell.appendChild(namePara);

      const roleCell = document.createElement('td');
      const roleDiv = document.createElement('div');
      roleDiv.className = 'gm-role-name';
      if (!player.isHost && player.role.image) {
        const roleImg = document.createElement('img');
        roleImg.className = 'gm-role-image';
        roleImg.src = `/images/${player.role.image}`;
        roleImg.alt = player.role.name;
        roleDiv.appendChild(roleImg);
      }
      const roleText = document.createElement('span');
      roleText.textContent = player.role.name;
      roleDiv.appendChild(roleText);
      roleCell.appendChild(roleDiv);

      const teamCell = document.createElement('td');
      const teamBadge = document.createElement('span');
      teamBadge.className = `gm-team-badge team-${player.role.team}`;
      teamBadge.textContent = player.role.team === 'werewolves' ? '🐺 Loup-Garou' : player.role.team === 'villagers' ? '👥 Villageois' : '👑 Maître';
      teamCell.appendChild(teamBadge);

      const detailsCell = document.createElement('td');
      const detailsContainer = document.createElement('div');
      detailsContainer.style.display = 'flex';
      detailsContainer.style.flexDirection = 'column';
      detailsContainer.style.gap = '8px';

      if (player.isDrunk) {
        const drunkBadge = document.createElement('span');
        drunkBadge.className = 'drunk-badge';
        drunkBadge.style.cssText = 'padding:4px 8px;background-color:#ff9800;color:white;border-radius:4px;font-size:0.85em;display:inline-block;';
        drunkBadge.textContent = '🍺 Bourré';
        detailsContainer.appendChild(drunkBadge);
      }
      if (player.renardDetails) {
        const info = document.createElement('div');
        info.className = 'gm-detail-card';
        info.style.cssText = 'padding:8px;background-color:#e3f2fd;border:1px solid #2196f3;border-radius:4px;font-size:0.85em;';
        info.innerHTML = `<strong>🦊 Info Renard</strong><br>Loup: ${escapeHtml(player.renardDetails.werewolfRole.name)}<br>Joueurs: ${player.renardDetails.twoPlayerNames.map(escapeHtml).join(', ')}`;
        detailsContainer.appendChild(info);
      }
      if (player.petiteFilleDetails) {
        const info = document.createElement('div');
        info.className = 'gm-detail-card';
        info.style.cssText = 'padding:8px;background-color:#fce4ec;border:1px solid #e91e63;border-radius:4px;font-size:0.85em;';
        info.innerHTML = `<strong>👧 Info Petite Fille</strong><br>Villageois: ${escapeHtml(player.petiteFilleDetails.villagerRole.name)}<br>Joueurs: ${player.petiteFilleDetails.twoPlayerNames.map(escapeHtml).join(', ')}`;
        detailsContainer.appendChild(info);
      }
      if (player.bluffRole) {
        const info = document.createElement('div');
        info.className = 'gm-detail-card';
        info.style.cssText = 'padding:8px;background-color:#f3e5f5;border:1px solid #9c27b0;border-radius:4px;font-size:0.85em;';
        info.innerHTML = `<strong>🎭 Rôle Bluff</strong><br>${escapeHtml(player.bluffRole.name)}`;
        detailsContainer.appendChild(info);
      }
      if (player.voyanteDecoy) {
        const info = document.createElement('div');
        info.className = 'gm-detail-card';
        info.style.cssText = 'padding:8px;background-color:#fff3cd;border:1px solid #ffc107;border-radius:4px;font-size:0.85em;';
        info.innerHTML = `<strong>🔮 Leurre Voyante</strong>`;
        detailsContainer.appendChild(info);
      }
      detailsCell.appendChild(detailsContainer);
      row.append(nameCell, roleCell, teamCell, detailsCell);
      tableBody.appendChild(row);
    });
  }

  function renderRoleScreen(role, bluffRole = null, bluffSpecialInfo = null) {
    const roleImage = document.getElementById('role-image');
    roleImage.src = `/images/${role.image}`;
    roleImage.alt = role.name;
    document.getElementById('role-name').textContent = role.name;
    const teamBadge = document.getElementById('role-team');
    teamBadge.textContent = role.team === 'werewolves' ? '🐺 Loup-Garou' : '👥 Villageois';
    teamBadge.className = `role-team-badge team-${role.team}`;
    document.getElementById('role-power').textContent = role.power;
    document.getElementById('role-info').textContent = role.info;

    const bluffSection = document.getElementById('bluff-role-section');
    if (bluffRole && role.team === 'werewolves') {
      bluffSection.style.display = 'block';
      document.getElementById('bluff-role-image').src = `/images/${bluffRole.image}`;
      document.getElementById('bluff-role-image').alt = bluffRole.name;
      document.getElementById('bluff-role-name').textContent = bluffRole.name;
      document.getElementById('bluff-role-power').textContent = bluffRole.power;
      document.getElementById('bluff-role-info').textContent = bluffRole.info;
    } else {
      bluffSection.style.display = 'none';
    }

    const bluffSpecialSection = document.getElementById('bluff-special-info-section');
    if (bluffSpecialInfo && role.team === 'werewolves') {
      bluffSpecialSection.style.display = 'block';
      const contentDiv = document.getElementById('bluff-special-info-content');
      if (bluffSpecialInfo.type === 'renard') {
        contentDiv.innerHTML = `<strong>🦊 Info Renard (Bluff)</strong><br>Loup: ${escapeHtml(bluffSpecialInfo.role.name)}<br>Joueurs: ${bluffSpecialInfo.twoPlayerNames.map(escapeHtml).join(', ')}`;
      } else if (bluffSpecialInfo.type === 'petite-fille') {
        contentDiv.innerHTML = `<strong>👧 Info Petite Fille (Bluff)</strong><br>Villageois: ${escapeHtml(bluffSpecialInfo.role.name)}<br>Joueurs: ${bluffSpecialInfo.twoPlayerNames.map(escapeHtml).join(', ')}`;
      }
    } else {
      bluffSpecialSection.style.display = 'none';
    }
  }

  window.GameViewRenderers = { renderGameMasterScreen, renderRoleScreen };
})();