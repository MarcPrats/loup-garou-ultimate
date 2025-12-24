/**
 * Loup Garou Ultimate - Multiplayer Server
 * Manages game rooms, player connections, and game state
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files
app.use(express.static(__dirname));

// Game rooms storage
const gameRooms = new Map();

// Available game roles
const GAME_ROLES = [
    { 
        id: 'loup-garou-ultime', 
        name: 'Loup Garou Ultime', 
        team: 'werewolves', 
        image: 'loupgarou.webp',
        description: "Chaque nuit (sauf la première), choisissez un joueur. Il meurt. Note: Vous pouvez choisir de vous tuer vous même et l'infect loup garou ou le grand loup jouera votre rôle. Le loup garou ultime prend connaissance d'un rôle de villageois qui n'est pas présent dans la partie afin de pouvoir se faire passer pour celui-ci. Conseil: ciblez les personnages qui acquièrent de l'information (voyante, enfant sauvage, cupidon) et évitez de mordre l'ancien."
    },
    { 
        id: 'infect-loup', 
        name: 'Infect Loup Garou', 
        team: 'werewolves', 
        image: 'infectloup.webp',
        description: "Chaque nuit, choisissez un joueur. Ce joueur est empoisonné et ne bénéficie plus de son pouvoir jusqu'au début de la prochaine nuit. Le loup garou infect prend connaissance d'un rôle de villageois qui n'est pas présent dans la partie. Le poison annule ou altère les pouvoirs des villageois. Conseil: de bonnes cibles pour l'empoisonnement sont Cupidon, la voyante, l'ancien ou le chevalier dont les pouvoirs vous gêneront amplement."
    },
    { 
        id: 'grand-loup', 
        name: 'Grand Loup Garou', 
        team: 'werewolves', 
        image: 'grandloup.webp',
        description: "S'il y a toujours plus de 5 joueurs en vie et que le loup garou ultime meurt, vous devenez le loup garou ultime. Le grand loup garou prend connaissance d'un rôle de villageois qui n'est pas présent dans la partie afin de pouvoir se faire passer pour celui-ci."
    },
    { 
        id: 'petite-fille', 
        name: 'Petite Fille', 
        team: 'villagers', 
        image: 'petite-fille.webp',
        description: "Lors de la première nuit, le maître du jeu vous montrera un rôle de villageois puis pointera deux joueurs. L'un de ces deux joueurs est le villageois précédemment montré. Conseil: votre pouvoir ne s'applique que lors de la première nuit. N'hésitez pas à partager au plus vite vos informations."
    },
    { 
        id: 'renard', 
        name: 'Renard', 
        team: 'villagers', 
        image: 'renard.webp',
        description: "Lors de la première nuit, le maître du jeu vous montrera un rôle de loup garou (sauf celui du loup garou ultime) puis pointera deux joueurs. L'un de ces deux joueurs est le loup garou précédemment montré. Conseil: votre pouvoir ne s'applique que lors de la première nuit. N'hésitez pas à partager au plus vite vos informations."
    },
    { 
        id: 'loup-blanc', 
        name: 'Loup Blanc', 
        team: 'villagers', 
        image: 'loup_blanc.webp',
        description: "Lors de la première nuit, vous découvrez combien de loup garous sont placés côte à côte. Conseil: votre pouvoir ne s'applique que lors de la première nuit. N'hésitez pas à partager au plus vite vos informations."
    },
    { 
        id: 'cupidon', 
        name: 'Cupidon', 
        team: 'villagers', 
        image: 'cupidon.webp',
        description: "Chaque nuit, parmi les deux joueurs vivants qui vos entourent, vous apprenez combien de loup garous vous entourent (0, 1 ou 2). Conseil: votre pouvoir s'applique chaque nuit et vous serez probablement une cible pour le loup garou ultime. Votre discrétion peut être un atout pour ne pas tenter sa morsure."
    },
    { 
        id: 'voyante', 
        name: 'Voyante', 
        team: 'villagers', 
        image: 'voyante.webp',
        description: "Chaque nuit, choisissez deux joueurs. Si au moins l'un deux est le loup garou ultime, vous aurez l'information. ATTENTION: l'un des villageois est un leurre et vous apparaîtra comme le loup garou ultime ! Conseil: votre pouvoir s'applique chaque nuit et vous serez probablement une cible pour le loup garou ultime. Votre discrétion peut être un atout pour ne pas tenter sa morsure."
    },
    { 
        id: 'chevalier', 
        name: 'Chevalier', 
        team: 'villagers', 
        image: 'chevalier.webp',
        description: "Chaque nuit (sauf la première), choisissez un autre personnage, celui-ci est protégé du loup garou ultime le temps d'une nuit. Conseil: votre pouvoir peut être précieux pour des personnages faisant l'acquisition d'information régulièrement ou à pouvoir unique tels que Cupidon, la voyante ou le chasseur. Essayer vite de les identifier afin de les protéger."
    },
    { 
        id: 'chasseur', 
        name: 'Chasseur', 
        team: 'villagers', 
        image: 'chasseur.webp',
        description: "Une fois par partie, pendant la journée, choisissez publiquement un joueur. Si c'est le loup garou ultime, il meurt. Conseil: votre pouvoir ne se réalise qu'une seule fois donc essayez de l'utiliser avant de mourir. Même si vous vous trompez, votre cible ne mourra pas et vous saurez que ce n'est pas le loup garou ultime."
    },
    { 
        id: 'flutiste', 
        name: 'Joueur de flûte', 
        team: 'villagers', 
        image: 'flute.webp',
        description: "Pendant la journée, si un joueur vous désigne pour une exécution et, que ce joueur est un villageois (à part si c'est l'ange ou s'il est bourré), alors il est immédiatement exécuté. Ce pouvoir n'est utlisé qu'une seule fois. ATTENTION: ne dites rien lorsque c'est le cas. Le maître du jeu interviendra à ce moment précis. Conseil: ce pouvoir vous permet de vous protéger des mauvaises accusations donc n'hésitez pas à l'énoncer si on vous accuse à tort."
    },
    { 
        id: 'sorciere', 
        name: 'Sorcière', 
        team: 'villagers', 
        image: 'sorciere.webp',
        description: "Si vous mourrez la nuit, vous choisissez un personnage et découvrez son identité. Conseil: votre pouvoir se déclenche à votre mort. Donc n'hésitez pas à vous faire passer pour un personnage en possession d'informations afin d'attirer la morsure du loup garou. Si vous vous faites éliminer par le village, votre pouvoir ne se déclenchera pas."
    },
    { 
        id: 'ancien', 
        name: 'Ancien', 
        team: 'villagers', 
        image: 'ancien.webp',
        description: "Le loup garou ultime ne peut pas vous tuer. Conseil: votre pouvoir vous permet d'annuler la morsure du loup garou ultime pendant une nuit. N'hésitez pas à vous faire passer pour une proie du loup garou ultime (en prétendant d'avoir de précieuses informations) afin qu'il s'en prenne à vous la nuit."
    },
    { 
        id: 'enfant-sauvage', 
        name: 'Enfant Sauvage', 
        team: 'villagers', 
        image: 'enfant.webp',
        description: "Si un joueur est executé par le village durant la journée, vous découvrez son identité la nuit. Conseil: votre pouvoir se déclenche uniquement après l'exécution du jour donc n'hésitez pas à déclencher des nominations/exécutions pour innocenter/accuser quelqu'un."
    },
    { 
        id: 'ange', 
        name: 'Ange', 
        team: 'villagers', 
        image: 'ange.webp',
        description: "Si le village vous élimine, le village perd la partie. Conseil: votre personnage peut vous protéger de fausses accusations en révélant votre rôle. Donc n'hésitez à l'énoncer pour vous protéger."
    }
];

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Assign random roles to players (excluding host/game master)
function assignRoles(players, hostSocketId) {
    // Filter out the host - they are the game master
    const playersToAssignRoles = players.filter(p => p.socketId !== hostSocketId);
    const playerCount = playersToAssignRoles.length;
    const shuffledRoles = shuffleArray(GAME_ROLES);
    const selectedRoles = shuffledRoles.slice(0, playerCount);
    
    const assignments = new Map();
    playersToAssignRoles.forEach((player, index) => {
        assignments.set(player.socketId, selectedRoles[index]);
    });
    
    return assignments;
}

// Generate random 4-character room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Check if code already exists
    if (gameRooms.has(code)) {
        return generateRoomCode();
    }
    return code;
}

// Room class to manage game state
class GameRoom {
    constructor(code, hostSocketId) {
        this.code = code;
        this.hostSocketId = hostSocketId;
        this.players = new Map();
        this.gameStarted = false;
        this.createdAt = Date.now();
        this.roleAssignments = new Map();
    }

    addPlayer(socketId, playerName) {
        this.players.set(socketId, {
            name: playerName,
            socketId: socketId,
            isHost: socketId === this.hostSocketId,
            joinedAt: Date.now()
        });
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
        // If host leaves, assign new host
        if (socketId === this.hostSocketId && this.players.size > 0) {
            const firstPlayer = this.players.values().next().value;
            this.hostSocketId = firstPlayer.socketId;
            firstPlayer.isHost = true;
        }
    }

    getPlayers() {
        return Array.from(this.players.values());
    }

    isEmpty() {
        return this.players.size === 0;
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🎮 Player connected: ${socket.id}`);

    // Create a new game room
    socket.on('create-room', (playerName, callback) => {
        const roomCode = generateRoomCode();
        const room = new GameRoom(roomCode, socket.id);
        room.addPlayer(socket.id, playerName);
        gameRooms.set(roomCode, room);
        
        socket.join(roomCode);
        
        console.log(`🏠 Room created: ${roomCode} by ${playerName}`);
        
        callback({
            success: true,
            roomCode: roomCode,
            players: room.getPlayers()
        });
    });

    // Join an existing room
    socket.on('join-room', (data, callback) => {
        const { roomCode, playerName } = data;
        const room = gameRooms.get(roomCode.toUpperCase());

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        if (room.gameStarted) {
            callback({ success: false, error: 'Game already started' });
            return;
        }

        room.addPlayer(socket.id, playerName);
        socket.join(roomCode);

        console.log(`👋 ${playerName} joined room ${roomCode}`);

        // Notify all players in the room
        io.to(roomCode).emit('player-joined', {
            players: room.getPlayers(),
            newPlayer: playerName
        });

        callback({
            success: true,
            roomCode: roomCode,
            players: room.getPlayers()
        });
    });

    // Start the game
    socket.on('start-game', (roomCode, callback) => {
        const room = gameRooms.get(roomCode);
        
        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        if (socket.id !== room.hostSocketId) {
            callback({ success: false, error: 'Only host can start the game' });
            return;
        }

        if (room.players.size < 4) {
            callback({ success: false, error: 'Need at least 4 players (including game master)' });
            return;
        }

        room.gameStarted = true;
        
        // Assign roles to all players except the host (game master)
        const playersList = room.getPlayers();
        room.roleAssignments = assignRoles(playersList, room.hostSocketId);
        
        // Prepare role map for game master
        const roleMap = playersList.map(player => {
            const role = room.roleAssignments.get(player.socketId);
            return {
                playerName: player.name,
                socketId: player.socketId,
                isHost: player.isHost,
                role: role || { id: 'game-master', name: 'Maître du Jeu', team: 'neutral' }
            };
        });
        
        // Send full role map to the host (game master)
        io.to(room.hostSocketId).emit('game-master-view', {
            players: roleMap
        });
        
        // Send individual roles to each player (except host)
        playersList.forEach(player => {
            if (player.socketId !== room.hostSocketId) {
                const role = room.roleAssignments.get(player.socketId);
                io.to(player.socketId).emit('role-assigned', {
                    role: role
                });
            }
        });
        
        // Notify all players that game is starting
        io.to(roomCode).emit('game-starting', {
            players: room.getPlayers()
        });

        console.log(`🎲 Game starting in room ${roomCode} with ${room.players.size} players`);
        console.log(`🎭 Roles assigned:`, Array.from(room.roleAssignments.values()).map(r => r.name));
        console.log(`👑 Game Master: ${playersList.find(p => p.socketId === room.hostSocketId).name}`);

        callback({ success: true });
    });

    // Player disconnection
    socket.on('disconnect', () => {
        console.log(`👋 Player disconnected: ${socket.id}`);

        // Find and remove player from any room
        for (const [roomCode, room] of gameRooms.entries()) {
            if (room.players.has(socket.id)) {
                const player = room.players.get(socket.id);
                room.removePlayer(socket.id);

                // Notify other players
                io.to(roomCode).emit('player-left', {
                    players: room.getPlayers(),
                    leftPlayer: player.name
                });

                // Clean up empty rooms
                if (room.isEmpty()) {
                    gameRooms.delete(roomCode);
                    console.log(`🗑️  Room ${roomCode} deleted (empty)`);
                }

                break;
            }
        }
    });

    // Get room info
    socket.on('get-room-info', (roomCode, callback) => {
        const room = gameRooms.get(roomCode);
        if (room) {
            callback({
                success: true,
                players: room.getPlayers(),
                gameStarted: room.gameStarted
            });
        } else {
            callback({ success: false, error: 'Room not found' });
        }
    });
});

// API endpoint to check server status
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        activeRooms: gameRooms.size,
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Loup Garou Ultimate server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO ready for connections`);
});

// Clean up old rooms periodically (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [roomCode, room] of gameRooms.entries()) {
        // Delete rooms older than 4 hours
        if (now - room.createdAt > 4 * 60 * 60 * 1000) {
            gameRooms.delete(roomCode);
            console.log(`🗑️  Room ${roomCode} deleted (timeout)`);
        }
    }
}, 10 * 60 * 1000);
