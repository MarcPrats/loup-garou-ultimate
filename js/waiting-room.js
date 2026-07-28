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
        this.actionType = null;

        this.init();
    }

    init() {
        this.connectToServer();
        this.setupEventListeners();

        // Check if there's a role token in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const roleToken = urlParams.get('token');
        const storedState = this.getStoredWaitingRoomState();

        if (roleToken) {
            this.loadRoleFromToken(roleToken);
        } else if (storedState && storedState.roomCode && storedState.playerName) {
            this.playerName = storedState.playerName;
            this.playerId = storedState.playerId || this.getOrCreatePlayerId();
            this.currentRoomCode = storedState.roomCode;
            this.isHost = Boolean(storedState.isHost);
            localStorage.setItem('playerName', storedState.playerName);
            localStorage.setItem('isHost', storedState.isHost ? 'true' : 'false');
            this.showScreen('home-screen');
        } else {
            this.showScreen('home-screen');
        }
    }

    connectToServer() {
        this.socket = io({
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
            timeout: 20000,
            transports: ['websocket', 'polling']
        });

        this.startKeepAlive();

        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            this.updateConnectionStatus(true);
            this.handleReconnection();
            this.handleAutoEntry();
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from server:', reason);
            this.updateConnectionStatus(false);
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

        this.socket.on('room-left', (data) => {
            this.clearWaitingRoomState();
            this.showNotification('Vous avez quitté la salle', 'info');
            setTimeout(() => { window.location.href = '/'; }, 800);
        });

        this.socket.on('kicked-from-room', (data) => {
            this.clearWaitingRoomState();
            this.showNotification(data.message || 'Vous avez été expulsé de la salle', 'info');
            setTimeout(() => { window.location.href = '/'; }, 1500);
        });

        this.socket.on('game-starting', (data) => {
            this.showNotification('La partie commence !', 'success');
        });

        this.socket.on('role-assigned', (data) => {
            console.log('Role token received:', data.token);
            const newUrl = `${window.location.pathname}?token=${data.token}`;
            window.history.pushState({ token: data.token }, '', newUrl);
            this.loadRoleFromToken(data.token);
        });

        this.socket.on('game-master-view', (data) => {
            console.log('Game master view:', data.players);
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
        // Name input
        document.getElementById('name-continue-btn').addEventListener('click', () => {
            this.handleNameSubmit();
        });

        document.getElementById('player-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleNameSubmit();
        });

        document.getElementById('name-back-btn').addEventListener('click', () => {
            window.location.href = '/';
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

        // Waiting room → rules
        document.getElementById('waiting-view-rules-btn').addEventListener('click', () => {
            window.open('reference.html', '_blank');
        });

        // Role screen
        document.getElementById('view-rules-btn').addEventListener('click', () => {
            window.open('reference.html', '_blank');
        });

        // Game master screen
        document.getElementById('gm-view-rules-btn').addEventListener('click', () => {
            window.open('reference.html', '_blank');
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

        // Name screen is only reached when joining as a player
        this.joinRoomWithCode(null);
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

    joinRoomWithCode(code) {
        localStorage.setItem('isHost', 'false');
        const roomCode = code || 'WOLF';

        this.socket.emit('join-room', {
            roomCode,
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
                this.showError('name-input-screen', response.error || 'Impossible de rejoindre la partie');
            }
        });
    }

    showWaitingRoom(roomCode, players) {
        this.showScreen('waiting-room-screen');

        const invitationLink = `${window.location.origin}/waiting_room`;
        document.getElementById('invitation-link').value = invitationLink;

        this.updatePlayersList(players);
        this.persistWaitingRoomState(roomCode, this.playerName || localStorage.getItem('playerName') || '', this.isHost);
        this.updateRoomUrl(roomCode);

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
        window.GameViewRenderers.renderGameMasterScreen(players);
    }

    updatePlayersList(players) {
        const playersList = document.getElementById('players-list');
        const gameMasterList = document.getElementById('game-master-list');
        const playerCount = document.getElementById('player-count');

        const gameMaster = players.find(p => p.isHost);
        const regularPlayers = players.filter(p => !p.isHost);

        playerCount.textContent = regularPlayers.length;
        playersList.innerHTML = '';
        gameMasterList.innerHTML = '';

        if (gameMaster) {
            const gmCard = document.createElement('div');
            gmCard.className = 'player-card';
            gmCard.innerHTML = `${this.escapeHtml(gameMaster.name)}<span class="host-badge">👑 Narrateur</span>`;
            gameMasterList.appendChild(gmCard);
        }

        regularPlayers.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = player.name;
            playerCard.appendChild(nameSpan);

            if (this.isHost && !player.isHost && player.playerId) {
                const kickButton = document.createElement('button');
                kickButton.className = 'kick-btn';
                kickButton.textContent = 'Expulser';
                kickButton.addEventListener('click', () => this.kickPlayer(player));
                playerCard.appendChild(kickButton);
            }

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
        if (confirm('Voulez-vous vraiment quitter la salle ?')) {
            this.socket.emit('leave-room', {
                roomCode: this.currentRoomCode || 'WOLF',
                playerId: this.playerId || this.getOrCreatePlayerId()
            }, (response) => {
                if (response && response.success) {
                    this.clearWaitingRoomState();
                    this.currentRoomCode = null;
                    this.isHost = false;
                    this.showScreen('home-screen');
                }
            });
        }
    }

    kickPlayer(player) {
        if (!this.isHost) return;
        if (!confirm(`Expulser ${player.name} de la salle ?`)) return;

        this.socket.emit('kick-player', {
            roomCode: this.currentRoomCode || 'WOLF',
            playerId: player.playerId
        }, (response) => {
            if (!response || !response.success) {
                this.showNotification(response?.error || 'Impossible d\'expulser ce joueur', 'info');
            }
        });
    }

    showRoleScreen(role, bluffRole = null, bluffSpecialInfo = null) {
        this.showScreen('role-screen');
        window.GameViewRenderers.renderRoleScreen(role, bluffRole, bluffSpecialInfo);
    }

    copyInvitationLink() {
        const linkInput = document.getElementById('invitation-link');
        const link = linkInput.value;

        navigator.clipboard.writeText(link).then(() => {
            this.showNotification('Lien copié ! Partagez-le avec vos amis 🎉', 'success');
            linkInput.select();
            setTimeout(() => window.getSelection().removeAllRanges(), 1000);
        }).catch(() => {
            linkInput.select();
            document.execCommand('copy');
            this.showNotification('Lien copié ! Partagez-le avec vos amis 🎉', 'success');
        });
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        this.clearErrors();
    }

    showError(screenId, message) {
        const errorDiv = document.querySelector(`#${screenId} .error-message`) ||
            document.getElementById(`${screenId.replace('-screen', '')}-error`);
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => { errorDiv.style.display = 'none'; }, 4000);
        }
    }

    clearErrors() {
        document.querySelectorAll('.error-message').forEach(error => { error.style.display = 'none'; });
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
        this.keepAliveInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('keep-alive');
            }
        }, 25000);
    }

    getOrCreatePlayerId() {
        if (this.playerId) return this.playerId;
        let storedPlayerId = localStorage.getItem('loupGarouPlayerId');
        if (!storedPlayerId) {
            storedPlayerId = `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            localStorage.setItem('loupGarouPlayerId', storedPlayerId);
        }
        this.playerId = storedPlayerId;
        return storedPlayerId;
    }

    persistWaitingRoomState(roomCode, playerName, isHost) {
        const state = { roomCode, playerName, playerId: this.getOrCreatePlayerId(), isHost };
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
        window.history.replaceState({ roomCode }, '', '/waiting_room');
    }

    handleReconnection() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            console.log('🔄 Recovering state with token after reconnection');
            this.loadRoleFromToken(token);
            return;
        }

        const storedState = this.getStoredWaitingRoomState();
        const roomCode = storedState && storedState.roomCode;
        const playerName = this.playerName || localStorage.getItem('playerName') || (storedState && storedState.playerName);
        const isHost = this.isHost || (storedState && storedState.isHost) || localStorage.getItem('isHost') === 'true';

        if (!roomCode || !playerName) return;

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

    /**
     * The create/join decision now lives on the main page (index.html).
     * When arriving here we simply execute it:
     *   - no room yet  -> create the room, game master is named 'Le MJ'
     *   - room exists  -> ask for a player name, then join
     * Nothing to do if we already recovered a session or are showing a role.
     */
    handleAutoEntry() {
        if (this.autoEntryDone) return;

        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen && activeScreen.id !== 'home-screen') return;
        if (new URLSearchParams(window.location.search).get('token')) return;

        // A previous session is being recovered by handleReconnection()
        const storedState = this.getStoredWaitingRoomState();
        if (storedState && storedState.roomCode && storedState.playerName) return;

        this.autoEntryDone = true;

        this.socket.emit('get-room-list', {}, (response) => {
            if (response.available) {
                // A game already exists -> join it as a player
                this.actionType = 'join';
                this.showScreen('name-input-screen');
                const nameInput = document.getElementById('player-name-input');
                nameInput.value = '';
                nameInput.focus();
            } else {
                // No game yet -> create it, game master keeps the default name
                this.actionType = 'create';
                this.playerName = 'Le MJ';
                this.playerId = this.getOrCreatePlayerId();
                localStorage.setItem('playerName', 'Le MJ');
                this.createRoom();
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

document.addEventListener('DOMContentLoaded', () => {
    new WaitingRoomApp();
});