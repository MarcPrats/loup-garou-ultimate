/**
 * Loup Garou Ultimate - Waiting Room Client
 */

class WaitingRoomApp {
    constructor() {
        this.socket = null;
        this.playerName = '';
        this.playerId = null;
        this.currentRoomCode = null;
        this.isHost = false;
        this.actionType = null; // 'create' or 'join'

        this.init();
    }

    init() {
        this.connectToServer();
        this.setupEventListeners();

        // Check if there's a role token in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const roleToken = urlParams.get('token');
        const roomCode = urlParams.get('room');
        const storedState = this.getStoredWaitingRoomState();

        if (roleToken) {
            // Load role from token
            this.loadRoleFromToken(roleToken);
        } else if (storedState && storedState.roomCode && storedState.playerName) {
            this.playerName = storedState.playerName;
            this.playerId = storedState.playerId || this.getOrCreatePlayerId();
            this.currentRoomCode = storedState.roomCode;
            this.isHost = Boolean(storedState.isHost);
            localStorage.setItem('playerName', storedState.playerName);
            localStorage.setItem('isHost', storedState.isHost ? 'true' : 'false');
            this.showScreen('home-screen');
        } else if (roomCode) {
            // Auto-join mode - show name input then join
            this.actionType = 'join-from-link';
            this.pendingRoomCode = roomCode.toUpperCase();
            this.showScreen('name-input-screen');
            document.getElementById('player-name-input').focus();
        } else {
            this.showScreen('home-screen');
        }
    }

    connectToServer() {
        // Configure Socket.IO with reconnection options
        this.socket = io({
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
            timeout: 20000,
            transports: ['websocket', 'polling'] // Try websocket first, fallback to polling
        });

        // Keep-alive ping to prevent Replit from sleeping
        this.startKeepAlive();

        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            this.updateConnectionStatus(true);

            // Try to recover state after reconnection
            this.handleReconnection();
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from server:', reason);
            this.updateConnectionStatus(false);

            // Show reconnection message if not intentional disconnect
            if (reason !== 'io client disconnect') {
                this.showNotification('Connexion perdue... Reconnexion en cours...', 'info');
            }
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log('✅ Reconnected after', attemptNumber, 'attempts');
            this.showNotification('Reconnecté !', 'success');
        });

        this.socket.on('reconnect_attempt', () => {
            console.log('🔄 Attempting to reconnect...');
        });

        this.socket.on('reconnect_error', (error) => {
            console.log('❌ Reconnection error:', error);
        });

        this.socket.on('reconnect_failed', () => {
            console.log('❌ Reconnection failed');
            this.showNotification('Impossible de se reconnecter. Rechargez la page.', 'info');
        });

        this.socket.on('player-joined', (data) => {
            this.updatePlayersList(data.players);
            this.showNotification(`${data.newPlayer} a rejoint la partie`, 'success');
        });

        this.socket.on('player-left', (data) => {
            this.updatePlayersList(data.players);
            this.showNotification(`${data.leftPlayer} a quitté la partie`, 'info');
        });

        this.socket.on('game-starting', (data) => {
            this.showNotification('La partie commence !', 'success');
            // Wait for role assignment - don't redirect yet
        });

        this.socket.on('role-assigned', (data) => {
            console.log('Role token received:', data.token);
            // Update URL with token for persistence
            const newUrl = `${window.location.pathname}?token=${data.token}`;
            window.history.pushState({ token: data.token }, '', newUrl);
            // Fetch and display role
            this.loadRoleFromToken(data.token);
        });

        this.socket.on('game-master-view', (data) => {
            console.log('Game master view:', data.players);
            // Update URL with token for persistence
            const newUrl = `${window.location.pathname}?token=${data.token}`;
            window.history.pushState({ token: data.token }, '', newUrl);
            this.showGameMasterScreen(data.players);
        });
    }

    async loadRoleFromToken(token) {
        try {
            const response = await fetch(`/api/role/${token}`);
            if (!response.ok) {
                throw new Error('Failed to load role');
            }
            const roleData = await response.json();

            if (roleData.isGameMaster) {
                // Show game master view with stored players data
                if (roleData.players && roleData.players.length > 0) {
                    this.showGameMasterScreen(roleData.players);
                } else {
                    this.showScreen('home-screen');
                    this.showNotification('Aucune donnée de partie trouvée', 'info');
                }
            } else {
                this.showRoleScreen(roleData.role, roleData.bluffRole, roleData.bluffSpecialInfo);
            }
        } catch (error) {
            console.error('Error loading role:', error);
            this.showScreen('home-screen');
            this.showError('home-screen', 'Impossible de charger votre rôle');
        }
    }

    setupEventListeners() {
        // Home screen
        document.getElementById('create-room-btn').addEventListener('click', () => {
            this.actionType = 'create';
            this.showScreen('name-input-screen');
            const nameInput = document.getElementById('player-name-input');
            nameInput.value = 'Le Narrateur';
            nameInput.focus();
        });

        document.getElementById('join-room-btn').addEventListener('click', () => {
            this.actionType = 'join';
            this.showScreen('name-input-screen');
            document.getElementById('player-name-input').focus();
        });

        // Name input
        document.getElementById('name-continue-btn').addEventListener('click', () => {
            this.handleNameSubmit();
        });

        document.getElementById('player-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleNameSubmit();
        });

        document.getElementById('name-back-btn').addEventListener('click', () => {
            this.showScreen('home-screen');
        });

        // Join room
        document.getElementById('join-confirm-btn').addEventListener('click', () => {
            this.handleJoinRoom();
        });

        document.getElementById('room-code-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleJoinRoom();
        });

        document.getElementById('room-code-input').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        document.getElementById('join-back-btn').addEventListener('click', () => {
            this.showScreen('name-input-screen');
        });

        // Waiting room
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('leave-room-btn').addEventListener('click', () => {
            this.leaveRoom();
        });

        document.getElementById('copy-link-btn').addEventListener('click', () => {
            this.copyInvitationLink();
        });

        // Role screen
        document.getElementById('view-rules-btn').addEventListener('click', () => {
            window.open('index.html', '_blank');
        });

        // Game master screen
        document.getElementById('gm-view-rules-btn').addEventListener('click', () => {
            window.open('index.html', '_blank');
        });
    }

    handleNameSubmit() {
        const nameInput = document.getElementById('player-name-input');
        const name = nameInput.value.trim();

        if (name.length < 2) {
            this.showError('name-input-screen', 'Le nom doit contenir au moins 2 caractères');
            return;
        }

        this.playerName = name;
        this.playerId = this.getOrCreatePlayerId();
        localStorage.setItem('playerName', name);
        nameInput.value = '';

        if (this.actionType === 'create') {
            this.createRoom();
        } else if (this.actionType === 'join-from-link') {
            // Auto-join with the code from URL
            this.joinRoomWithCode(this.pendingRoomCode);
        } else {
            this.showScreen('join-screen');
            document.getElementById('room-code-input').focus();
        }
    }

    createRoom() {
        this.socket.emit('create-room', {
            playerName: this.playerName,
            playerId: this.playerId || this.getOrCreatePlayerId()
        }, (response) => {
            if (response.success) {
                this.currentRoomCode = response.roomCode;
                this.isHost = true;
                localStorage.setItem('isHost', 'true');
                this.persistWaitingRoomState(response.roomCode, this.playerName, true);
                this.showWaitingRoom(response.roomCode, response.players);
            } else {
                this.showError('name-input-screen', 'Erreur lors de la création de la partie');
            }
        });
    }

    handleJoinRoom() {
        const codeInput = document.getElementById('room-code-input');
        const code = codeInput.value.trim().toUpperCase();

        if (code.length !== 4) {
            this.showError('join-screen', 'Le code doit contenir 4 caractères');
            return;
        }

        this.joinRoomWithCode(code);
        codeInput.value = '';
    }

    joinRoomWithCode(code) {
        localStorage.setItem('isHost', 'false');

        this.socket.emit('join-room', {
            roomCode: code,
            playerName: this.playerName,
            playerId: this.playerId || this.getOrCreatePlayerId(),
            isHost: false
        }, (response) => {
            if (response.success) {
                this.currentRoomCode = response.roomCode;
                this.isHost = false;
                this.persistWaitingRoomState(response.roomCode, this.playerName, false);
                this.showWaitingRoom(response.roomCode, response.players);
            } else {
                if (this.actionType === 'join-from-link') {
                    this.showError('name-input-screen', response.error || 'Impossible de rejoindre la partie');
                    setTimeout(() => {
                        this.showScreen('home-screen');
                    }, 3000);
                } else {
                    this.showError('join-screen', response.error || 'Impossible de rejoindre la partie');
                }
            }
        });
    }

    showWaitingRoom(roomCode, players) {
        this.showScreen('waiting-room-screen');
        document.getElementById('room-code').textContent = roomCode;

        // Generate and display invitation link
        const invitationLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
        document.getElementById('invitation-link').value = invitationLink;

        this.updatePlayersList(players);
        this.persistWaitingRoomState(roomCode, this.playerName || localStorage.getItem('playerName') || '', this.isHost);
        this.updateRoomUrl(roomCode);

        // Show start button only for host
        if (this.isHost) {
            document.getElementById('start-game-btn').style.display = 'block';
            document.getElementById('waiting-message').style.display = 'none';
        } else {
            document.getElementById('start-game-btn').style.display = 'none';
            document.getElementById('waiting-message').style.display = 'block';
        }
    }

    showGameMasterScreen(players) {
        this.showScreen('game-master-screen');

        const tableBody = document.getElementById('gm-players-table');
        tableBody.innerHTML = '';

        // Calculate team counts
        let werewolfCount = 0;
        let villagerCount = 0;

        players.forEach(player => {
            if (player.role.team === 'werewolves') {
                werewolfCount++;
            } else if (player.role.team === 'villagers') {
                villagerCount++;
            }
        });

        // Update player count displays
        document.getElementById('gm-total-players').textContent = players.length;
        document.getElementById('gm-werewolf-count').textContent = werewolfCount;
        document.getElementById('gm-villager-count').textContent = villagerCount;

        players.forEach(player => {
            const row = document.createElement('tr');

            // Player name cell
            const nameCell = document.createElement('td');
            const namePara = document.createElement('div');
            namePara.className = `gm-player-name${player.isHost ? ' host' : ''}`;

            if (player.token) {
                // Make player name a clickable link
                const nameLink = document.createElement('a');
                nameLink.href = `${window.location.pathname}?token=${player.token}`;
                nameLink.textContent = player.playerName;
                nameLink.target = '_blank';
                nameLink.style.color = 'inherit';
                nameLink.style.textDecoration = 'none';
                nameLink.style.cursor = 'pointer';
                nameLink.addEventListener('mouseover', () => {
                    nameLink.style.textDecoration = 'underline';
                });
                nameLink.addEventListener('mouseout', () => {
                    nameLink.style.textDecoration = 'none';
                });
                namePara.appendChild(nameLink);
            } else {
                namePara.textContent = player.playerName;
            }

            nameCell.appendChild(namePara);

            // Role cell
            const roleCell = document.createElement('td');
            const roleDiv = document.createElement('div');
            roleDiv.className = 'gm-role-name';

            if (!player.isHost && player.role.image) {
                const roleImg = document.createElement('img');
                roleImg.className = 'gm-role-image';
                roleImg.src = `images/${player.role.image}`;
                roleImg.alt = player.role.name;
                roleDiv.appendChild(roleImg);
            }

            const roleText = document.createElement('span');
            roleText.textContent = player.role.name;
            roleDiv.appendChild(roleText);
            roleCell.appendChild(roleDiv);

            // Team cell
            const teamCell = document.createElement('td');
            const teamBadge = document.createElement('span');
            teamBadge.className = `gm-team-badge team-${player.role.team}`;

            if (player.role.team === 'werewolves') {
                teamBadge.textContent = '🐺 Loup-Garou';
            } else if (player.role.team === 'villagers') {
                teamBadge.textContent = '👥 Villageois';
            } else {
                teamBadge.textContent = '👑 Maître';
            }

            teamCell.appendChild(teamBadge);

            // Details cell (drunk status, renard info, petite fille info)
            const detailsCell = document.createElement('td');
            const detailsContainer = document.createElement('div');
            detailsContainer.style.display = 'flex';
            detailsContainer.style.flexDirection = 'column';
            detailsContainer.style.gap = '8px';

            if (player.isDrunk) {
                const drunkBadge = document.createElement('span');
                drunkBadge.className = 'drunk-badge';
                drunkBadge.style.padding = '4px 8px';
                drunkBadge.style.backgroundColor = '#ff9800';
                drunkBadge.style.color = 'white';
                drunkBadge.style.borderRadius = '4px';
                drunkBadge.style.fontSize = '0.85em';
                drunkBadge.style.display = 'inline-block';
                drunkBadge.textContent = '🍺 Bourré';
                detailsContainer.appendChild(drunkBadge);
            }

            if (player.renardDetails) {
                const renardInfo = document.createElement('div');
                renardInfo.className = 'special-info-box';
                renardInfo.style.padding = '8px';
                renardInfo.style.backgroundColor = '#e3f2fd';
                renardInfo.style.border = '1px solid #2196f3';
                renardInfo.style.borderRadius = '4px';
                renardInfo.style.fontSize = '0.85em';
                renardInfo.innerHTML = `
                    <div style="font-weight: bold; color: #1976d2; margin-bottom: 4px;">🦊 Info Renard</div>
                    <div style="color: #424242;"><strong>Loup:</strong> ${this.escapeHtml(player.renardDetails.werewolfRole.name)}</div>
                    <div style="color: #424242;"><strong>Joueurs:</strong> ${player.renardDetails.twoPlayerNames.map(n => this.escapeHtml(n)).join(', ')}</div>
                `;
                detailsContainer.appendChild(renardInfo);
            }

            if (player.petiteFilleDetails) {
                const petiteFilleInfo = document.createElement('div');
                petiteFilleInfo.className = 'special-info-box';
                petiteFilleInfo.style.padding = '8px';
                petiteFilleInfo.style.backgroundColor = '#fce4ec';
                petiteFilleInfo.style.border = '1px solid #e91e63';
                petiteFilleInfo.style.borderRadius = '4px';
                petiteFilleInfo.style.fontSize = '0.85em';
                petiteFilleInfo.innerHTML = `
                    <div style="font-weight: bold; color: #c2185b; margin-bottom: 4px;">👧 Info Petite Fille</div>
                    <div style="color: #424242;"><strong>Villageois:</strong> ${this.escapeHtml(player.petiteFilleDetails.villagerRole.name)}</div>
                    <div style="color: #424242;"><strong>Joueurs:</strong> ${player.petiteFilleDetails.twoPlayerNames.map(n => this.escapeHtml(n)).join(', ')}</div>
                `;
                detailsContainer.appendChild(petiteFilleInfo);
            }

            if (player.bluffRole) {
                const bluffInfo = document.createElement('div');
                bluffInfo.className = 'special-info-box';
                bluffInfo.style.padding = '8px';
                bluffInfo.style.backgroundColor = '#f3e5f5';
                bluffInfo.style.border = '1px solid #9c27b0';
                bluffInfo.style.borderRadius = '4px';
                bluffInfo.style.fontSize = '0.85em';
                bluffInfo.innerHTML = `
                    <div style="font-weight: bold; color: #7b1fa2; margin-bottom: 4px;">🎭 Rôle Bluff</div>
                    <div style="color: #424242;">${this.escapeHtml(player.bluffRole.name)}</div>
                `;
                detailsContainer.appendChild(bluffInfo);
            }

            if (player.voyanteDecoy) {
                const decoyInfo = document.createElement('div');
                decoyInfo.className = 'special-info-box';
                decoyInfo.style.padding = '8px';
                decoyInfo.style.backgroundColor = '#fff3cd';
                decoyInfo.style.border = '1px solid #ffc107';
                decoyInfo.style.borderRadius = '4px';
                decoyInfo.style.fontSize = '0.85em';
                decoyInfo.innerHTML = `
                    <div style="font-weight: bold; color: #856404; margin-bottom: 4px;">🔮 Leurre Voyante</div>
                    <div style="color: #424242;">${this.escapeHtml(player.voyanteDecoy)}</div>
                `;
                detailsContainer.appendChild(decoyInfo);
            }

            detailsCell.appendChild(detailsContainer);

            row.appendChild(nameCell);
            row.appendChild(roleCell);
            row.appendChild(teamCell);
            row.appendChild(detailsCell);
            tableBody.appendChild(row);
        });
    }

    updatePlayersList(players) {
        const playersList = document.getElementById('players-list');
        const gameMasterList = document.getElementById('game-master-list');
        const playerCount = document.getElementById('player-count');

        // Separate game master from regular players
        const gameMaster = players.find(p => p.isHost);
        const regularPlayers = players.filter(p => !p.isHost);

        playerCount.textContent = regularPlayers.length;
        playersList.innerHTML = '';
        gameMasterList.innerHTML = '';

        // Add game master
        if (gameMaster) {
            const gmCard = document.createElement('div');
            gmCard.className = 'player-card';
            gmCard.innerHTML = `
                <span class="player-name">${this.escapeHtml(gameMaster.name)}</span>
                <span class="host-badge">👑 Narrateur</span>
            `;
            gameMasterList.appendChild(gmCard);
        }

        // Add regular players
        regularPlayers.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            playerCard.innerHTML = `
                <span class="player-name">${this.escapeHtml(player.name)}</span>
            `;
            playersList.appendChild(playerCard);
        });
    }

    startGame() {
        const startBtn = document.getElementById('start-game-btn');
        startBtn.disabled = true;

        this.socket.emit('start-game', this.currentRoomCode, (response) => {
            if (!response.success) {
                this.showError('waiting-room-screen', response.error || 'Erreur lors du démarrage');
                startBtn.disabled = false;
            }
        });
    }

    leaveRoom() {
        if (confirm('Voulez-vous vraiment quitter la partie ?')) {
            this.clearWaitingRoomState();
            this.socket.disconnect();
            window.location.reload();
        }
    }

    showRoleScreen(role, bluffRole = null, bluffSpecialInfo = null) {
        this.showScreen('role-screen');

        // Set role image
        const roleImage = document.getElementById('role-image');
        roleImage.src = `images/${role.image}`;
        roleImage.alt = role.name;

        // Set role name
        document.getElementById('role-name').textContent = role.name;

        // Set team badge
        const teamBadge = document.getElementById('role-team');
        teamBadge.textContent = role.team === 'werewolves' ? '🐺 Loup-Garou' : '👥 Villageois';
        teamBadge.className = `role-team-badge team-${role.team}`;

        // Set role power and info
        document.getElementById('role-power').textContent = role.power;
        document.getElementById('role-info').textContent = role.info;

        // If this is a werewolf with a bluff role, display it
        const bluffSection = document.getElementById('bluff-role-section');
        if (bluffRole && role.team === 'werewolves') {
            bluffSection.style.display = 'block';

            // Set bluff role image
            const bluffRoleImage = document.getElementById('bluff-role-image');
            bluffRoleImage.src = `images/${bluffRole.image}`;
            bluffRoleImage.alt = bluffRole.name;

            document.getElementById('bluff-role-name').textContent = bluffRole.name;
            document.getElementById('bluff-role-power').textContent = bluffRole.power;
            document.getElementById('bluff-role-info').textContent = bluffRole.info;
        } else {
            bluffSection.style.display = 'none';
        }

        // If this werewolf has special bluff info (renard/petite-fille), display it
        const bluffSpecialSection = document.getElementById('bluff-special-info-section');
        if (bluffSpecialInfo && role.team === 'werewolves') {
            bluffSpecialSection.style.display = 'block';
            const contentDiv = document.getElementById('bluff-special-info-content');

            if (bluffSpecialInfo.type === 'renard') {
                contentDiv.innerHTML = `
                    <strong style="color: #1976d2;">🦊 Info Renard (Bluff)</strong><br>
                    <div style="margin-top: 8px; color: #424242;"><strong>Loup:</strong> ${this.escapeHtml(bluffSpecialInfo.role.name)}</div>
                    <div style="color: #424242;"><strong>Joueurs:</strong> ${bluffSpecialInfo.twoPlayerNames.map(n => this.escapeHtml(n)).join(', ')}</div>
                `;
            } else if (bluffSpecialInfo.type === 'petite-fille') {
                contentDiv.innerHTML = `
                    <strong style="color: #c2185b;">👧 Info Petite Fille (Bluff)</strong><br>
                    <div style="margin-top: 8px; color: #424242;"><strong>Villageois:</strong> ${this.escapeHtml(bluffSpecialInfo.role.name)}</div>
                    <div style="color: #424242;"><strong>Joueurs:</strong> ${bluffSpecialInfo.twoPlayerNames.map(n => this.escapeHtml(n)).join(', ')}</div>
                `;
            }
        } else {
            bluffSpecialSection.style.display = 'none';
        }
    }

    copyInvitationLink() {
        const linkInput = document.getElementById('invitation-link');
        const link = linkInput.value;

        navigator.clipboard.writeText(link).then(() => {
            this.showNotification('Lien copié ! Partagez-le avec vos amis 🎉', 'success');

            // Visual feedback
            linkInput.select();
            setTimeout(() => {
                window.getSelection().removeAllRanges();
            }, 1000);
        }).catch(() => {
            // Fallback for older browsers
            linkInput.select();
            document.execCommand('copy');
            this.showNotification('Lien copié ! Partagez-le avec vos amis 🎉', 'success');
        });
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.clearErrors();
    }

    showError(screenId, message) {
        const errorDiv = document.querySelector(`#${screenId} .error-message`) ||
            document.getElementById(`${screenId.replace('-screen', '')}-error`);
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 4000);
        }
    }

    clearErrors() {
        document.querySelectorAll('.error-message').forEach(error => {
            error.style.display = 'none';
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    startKeepAlive() {
        // Ping server every 25 seconds to keep connection alive
        // This prevents Replit from sleeping due to inactivity
        this.keepAliveInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('keep-alive');
            }
        }, 25000);
    }

    getOrCreatePlayerId() {
        if (this.playerId) {
            return this.playerId;
        }

        let storedPlayerId = localStorage.getItem('loupGarouPlayerId');
        if (!storedPlayerId) {
            storedPlayerId = `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            localStorage.setItem('loupGarouPlayerId', storedPlayerId);
        }

        this.playerId = storedPlayerId;
        return storedPlayerId;
    }

    persistWaitingRoomState(roomCode, playerName, isHost) {
        const state = {
            roomCode,
            playerName,
            playerId: this.getOrCreatePlayerId(),
            isHost
        };
        localStorage.setItem('loupGarouWaitingRoomState', JSON.stringify(state));
    }

    clearWaitingRoomState() {
        localStorage.removeItem('loupGarouWaitingRoomState');
        localStorage.removeItem('isHost');
    }

    getStoredWaitingRoomState() {
        try {
            const storedValue = localStorage.getItem('loupGarouWaitingRoomState');
            return storedValue ? JSON.parse(storedValue) : null;
        } catch (error) {
            console.warn('Unable to parse saved waiting room state', error);
            return null;
        }
    }

    updateRoomUrl(roomCode) {
        const newUrl = `${window.location.pathname}?room=${roomCode}`;
        window.history.replaceState({ roomCode }, '', newUrl);
    }

    handleReconnection() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const roomCodeFromUrl = urlParams.get('room');

        if (token) {
            console.log('🔄 Recovering state with token after reconnection');
            this.loadRoleFromToken(token);
            return;
        }

        const storedState = this.getStoredWaitingRoomState();
        const roomCode = roomCodeFromUrl || (storedState && storedState.roomCode);
        const playerName = this.playerName || localStorage.getItem('playerName') || (storedState && storedState.playerName);
        const isHost = this.isHost || (storedState && storedState.isHost) || localStorage.getItem('isHost') === 'true';

        if (!roomCode || !playerName) {
            return;
        }

        this.currentRoomCode = roomCode;
        this.playerName = playerName;
        this.isHost = Boolean(isHost);

        console.log(`🔄 Rejoining room ${roomCode} as ${this.isHost ? 'host' : 'player'}`);
        this.socket.emit('join-room', {
            roomCode,
            playerName,
            playerId: this.getOrCreatePlayerId(),
            isHost: this.isHost
        }, (response) => {
            if (response.success && !response.gameStarted) {
                this.showWaitingRoom(response.roomCode, response.players);
            } else if (response.error) {
                console.warn('Unable to recover waiting room state:', response.error);
                this.clearWaitingRoomState();
                this.showScreen('home-screen');
            }
        });
    }
    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connection-status');
        const statusText = statusEl.querySelector('.status-text');

        if (connected) {
            statusEl.classList.add('connected');
            statusText.textContent = 'Connecté';
        } else {
            statusEl.classList.remove('connected');
            statusText.textContent = 'Déconnecté';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WaitingRoomApp();
});
