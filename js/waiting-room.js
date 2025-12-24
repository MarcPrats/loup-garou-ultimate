/**
 * Loup Garou Ultimate - Waiting Room Client
 */

class WaitingRoomApp {
    constructor() {
        this.socket = null;
        this.playerName = '';
        this.currentRoomCode = null;
        this.isHost = false;
        this.actionType = null; // 'create' or 'join'

        this.init();
    }

    init() {
        this.connectToServer();
        this.setupEventListeners();

        // Check if there's a room code in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const roomCode = urlParams.get('room');

        if (roomCode) {
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
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            this.updateConnectionStatus(false);
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
            console.log('Role assigned:', data.role);
            this.showRoleScreen(data.role);
        });

        this.socket.on('game-master-view', (data) => {
            console.log('Game master view:', data.players);
            this.showGameMasterScreen(data.players);
        });
    }

    setupEventListeners() {
        // Home screen
        document.getElementById('create-room-btn').addEventListener('click', () => {
            this.actionType = 'create';
            this.showScreen('name-input-screen');
            document.getElementById('player-name-input').focus();
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

        document.getElementById('ready-btn').addEventListener('click', () => {
            this.showNotification('Bonne chance ! 🐺', 'success');
            // Here you would transition to the actual game screen
            // For now, we'll show the rules
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        });

        // Game master screen
        document.getElementById('gm-view-rules-btn').addEventListener('click', () => {
            window.open('index.html', '_blank');
        });

        document.getElementById('gm-start-night-btn').addEventListener('click', () => {
            this.showNotification('La nuit commence... 🌙', 'success');
            // Here you would start the night phase
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
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
        this.socket.emit('create-room', this.playerName, (response) => {
            if (response.success) {
                this.currentRoomCode = response.roomCode;
                this.isHost = true;
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
        this.socket.emit('join-room', { roomCode: code, playerName: this.playerName }, (response) => {
            if (response.success) {
                this.currentRoomCode = response.roomCode;
                this.isHost = false;
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

        players.forEach(player => {
            const row = document.createElement('tr');

            // Player name cell
            const nameCell = document.createElement('td');
            const namePara = document.createElement('div');
            namePara.className = `gm-player-name${player.isHost ? ' host' : ''}`;
            namePara.textContent = player.playerName;
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

            row.appendChild(nameCell);
            row.appendChild(roleCell);
            row.appendChild(teamCell);
            tableBody.appendChild(row);
        });
    }

    updatePlayersList(players) {
        const playersList = document.getElementById('players-list');
        const playerCount = document.getElementById('player-count');

        playerCount.textContent = players.length;
        playersList.innerHTML = '';

        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            playerCard.innerHTML = `
                <span class="player-name">${this.escapeHtml(player.name)}</span>
                ${player.isHost ? '<span class="host-badge">👑 Hôte</span>' : ''}
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
            this.socket.disconnect();
            window.location.reload();
        }
    }

    showRoleScreen(role) {
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

        // Set role description
        document.getElementById('role-description').textContent = role.description;
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
