/**
 * Loup Garou Ultimate - Multiplayer Server
 * Manages game rooms, player connections, and game state
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const MAX_NON_HOST_PLAYERS = 12;
const MIN_PLAYERS_TO_START = 5;
const DEFAULT_ROOM_CODE = 'WOLF';
const SIMULATOR_ENABLED = ['1', 'true', 'yes'].includes(
    process.env.ENABLE_SIMULATOR?.toLowerCase()
);

function simulatorGuard(req, res, next) {
    if (!SIMULATOR_ENABLED) {
        return res.status(404).json({ error: 'Simulator disabled. Set ENABLE_SIMULATOR=true to enable it.' });
    }
    next();
}

// Serve the shared waiting-room entry point
app.get(['/waiting_room', '/waiting_room/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'waiting-room.html'));
});

app.get(['/waiting-room', '/waiting-room/'], (req, res) => {
    res.redirect('/waiting_room');
});

// Development-only simulator. The page and its API are unavailable unless
// ENABLE_SIMULATOR=true (or 1/yes) is explicitly set.
app.get('/dev/simulator', simulatorGuard, (req, res) => {
    res.sendFile(path.join(__dirname, 'simulator.html'));
});
app.get('/dev/simulator/mj', simulatorGuard, (req, res) => {
    res.sendFile(path.join(__dirname, 'simulator-mj.html'));
});
app.get('/dev/simulator/player', simulatorGuard, (req, res) => {
    res.sendFile(path.join(__dirname, 'simulator-player.html'));
});
app.get('/simulator.html', simulatorGuard, (req, res) => {
    res.sendFile(path.join(__dirname, 'simulator.html'));
});
app.get('/js/simulator.js', simulatorGuard, (req, res) => {
    res.sendFile(path.join(__dirname, 'js/simulator.js'));
});
app.get('/js/simulator-view.js', simulatorGuard, (req, res) => {
    res.sendFile(path.join(__dirname, 'js/simulator-view.js'));
});
app.get('/js/simulator-mj.js', simulatorGuard, (req, res) => {
    res.sendFile(path.join(__dirname, 'js/simulator-mj.js'));
});
app.get('/js/simulator-player.js', simulatorGuard, (req, res) => {
    res.sendFile(path.join(__dirname, 'js/simulator-player.js'));
});

// Serve static files
app.use(express.static(__dirname));
app.use(express.json());

// API endpoint to get role data by token
app.get('/api/role/:token', (req, res) => {
    const token = req.params.token;
    const roleData = roleTokens.get(token);

    if (!roleData) {
        return res.status(404).json({ error: 'Role not found' });
    }

    res.json(roleData);
});

// Game rooms storage
const gameRooms = new Map();

// Role tokens storage: token -> { roomCode, playerName, role, isGameMaster }
const roleTokens = new Map();

// Available game roles
const GAME_ROLES = [
    {
        id: 'loup-garou-ultime',
        name: 'Loup Garou Ultime',
        team: 'werewolves',
        image: 'loupgarou.webp',
        power: "Chaque nuit (sauf la première), choisissez un joueur. Il meurt. Note : Vous pouvez choisir de vous tuer vous-même et l'infect loup-garou ou le grand loup jouera votre rôle.",
        info: "Le loup garou ultime prend connaissance d'un rôle de villageois qui n'est pas présent dans la partie afin de pouvoir se faire passer pour celui-ci. Ciblez les personnages qui acquièrent de l'information (voyante, enfant sauvage, cupidon) et évitez de mordre l'ancien."
    },
    {
        id: 'infect-loup',
        name: 'Infect Loup Garou',
        team: 'werewolves',
        image: 'infectloup.webp',
        power: "Chaque nuit, choisissez un joueur. Ce joueur est empoisonné et ne bénéficie plus de son pouvoir jusqu'au début de la prochaine nuit.",
        info: "Le loup garou infect prend connaissance d'un rôle de villageois qui n'est pas présent dans la partie. Le poison annule ou altère les pouvoirs des villageois. De bonnes cibles pour l'empoisonnement sont Cupidon, la voyante, l'ancien ou le chevalier dont les pouvoirs vous gêneront amplement."
    },
    {
        id: 'grand-loup',
        name: 'Grand Loup Garou',
        team: 'werewolves',
        image: 'grandloup.webp',
        power: "S'il y a toujours plus de 5 joueurs en vie et que le loup garou ultime meurt, vous devenez le loup garou ultime.",
        info: "Le grand loup garou prend connaissance d'un rôle de villageois qui n'est pas présent dans la partie afin de pouvoir se faire passer pour celui-ci."
    },
    {
        id: 'petite-fille',
        name: 'Petite Fille',
        team: 'villagers',
        image: 'petite-fille.webp',
        power: "Lors de la première nuit, le maître du jeu vous montrera un rôle de villageois puis pointera deux joueurs. L'un de ces deux joueurs est le villageois précédemment montré.",
        info: "Votre pouvoir ne s'applique que lors de la première nuit. N'hésitez pas à partager au plus vite vos informations."
    },
    {
        id: 'renard',
        name: 'Renard',
        team: 'villagers',
        image: 'renard.webp',
        power: "Lors de la première nuit, le maître du jeu vous montrera un rôle de loup garou (sauf celui du loup garou ultime) puis pointera deux joueurs. L'un de ces deux joueurs est le loup garou précédemment montré.",
        info: "Votre pouvoir ne s'applique que lors de la première nuit. N'hésitez pas à partager au plus vite vos informations."
    },
    {
        id: 'montreur-dours',
        name: 'Montreur d’ours',
        team: 'villagers',
        image: 'montreur-dours.webp',
        power: "Lors de la première nuit, vous découvrez combien de loup garous sont placés côte à côte.",
        info: "Votre pouvoir ne s'applique que lors de la première nuit. N'hésitez pas à partager au plus vite vos informations."
    },
    {
        id: 'cupidon',
        name: 'Cupidon',
        team: 'villagers',
        image: 'cupidon.webp',
        power: "Chaque nuit, parmi les deux joueurs vivants qui vous entourent, vous apprenez combien de loup garous vous entourent (0, 1 ou 2).",
        info: "Votre pouvoir s'applique chaque nuit et vous serez probablement une cible pour le loup garou ultime. Votre discrétion peut être un atout pour ne pas tenter sa morsure."
    },
    {
        id: 'voyante',
        name: 'Voyante',
        team: 'villagers',
        image: 'voyante.webp',
        power: "Chaque nuit, choisissez deux joueurs. Si au moins l'un d'eux est le loup garou ultime, vous aurez l'information. ATTENTION : l'un des villageois est un leurre et vous apparaîtra comme le loup garou ultime !",
        info: "Votre pouvoir s'applique chaque nuit et vous serez probablement une cible pour le loup garou ultime. Votre discrétion peut être un atout pour ne pas tenter sa morsure."
    },
    {
        id: 'chevalier',
        name: 'Chevalier',
        team: 'villagers',
        image: 'chevalier.webp',
        power: "Chaque nuit (sauf la première), choisissez un autre personnage, celui-ci est protégé du loup garou ultime le temps d'une nuit.",
        info: "Votre pouvoir peut être précieux pour des personnages faisant l'acquisition d'information régulièrement ou à pouvoir unique tels que Cupidon, la voyante ou le chasseur. Essayez vite de les identifier afin de les protéger."
    },
    {
        id: 'chasseur',
        name: 'Chasseur',
        team: 'villagers',
        image: 'chasseur.webp',
        power: "Une fois par partie, pendant la journée, choisissez publiquement un joueur. Si c'est le loup garou ultime, il meurt.",
        info: "Votre pouvoir ne se réalise qu'une seule fois donc essayez de l'utiliser avant de mourir. Même si vous vous trompez, votre cible ne mourra pas et vous saurez que ce n'est pas le loup garou ultime."
    },
    {
        id: 'flutiste',
        name: 'Joueur de flûte',
        team: 'villagers',
        image: 'flute.webp',
        power: "Pendant la journée, si un joueur vous désigne pour une exécution et que ce joueur est un villageois (à part si c'est l'ange ou s'il est bourré), alors il est immédiatement exécuté. Ce pouvoir n'est utilisé qu'une seule fois. ATTENTION : ne dites rien lorsque c'est le cas. Le maître du jeu interviendra à ce moment précis.",
        info: "Ce pouvoir vous permet de vous protéger des mauvaises accusations, donc n'hésitez pas à l'énoncer si on vous accuse à tort."
    },
    {
        id: 'sorciere',
        name: 'Sorcière',
        team: 'villagers',
        image: 'sorciere.webp',
        power: "Si vous mourrez la nuit, vous choisissez un personnage et découvrez son identité.",
        info: "Votre pouvoir se déclenche à votre mort. Donc n'hésitez pas à vous faire passer pour un personnage en possession d'informations afin d'attirer la morsure du loup garou. Si vous vous faites éliminer par le village, votre pouvoir ne se déclenchera pas."
    },
    {
        id: 'ancien',
        name: 'Ancien',
        team: 'villagers',
        image: 'ancien.webp',
        power: "Le loup garou ultime ne peut pas vous tuer.",
        info: "Votre pouvoir vous permet d'annuler la morsure du loup garou ultime pendant une nuit. N'hésitez pas à vous faire passer pour une proie du loup garou ultime (en prétendant d'avoir de précieuses informations) afin qu'il s'en prenne à vous la nuit."
    },
    {
        id: 'enfant-sauvage',
        name: 'Enfant Sauvage',
        team: 'villagers',
        image: 'enfant.webp',
        power: "Si un joueur est exécuté par le village durant la journée, vous découvrez son identité la nuit.",
        info: "Votre pouvoir se déclenche uniquement après l'exécution du jour donc n'hésitez pas à déclencher des nominations/exécutions pour innocenter/accuser quelqu'un."
    },
    {
        id: 'ange',
        name: 'Ange',
        team: 'villagers',
        image: 'ange.webp',
        power: "Si le village vous élimine, le village perd la partie.",
        info: "Votre personnage peut vous protéger de fausses accusations en révélant votre rôle. Donc n'hésitez à l'énoncer pour vous protéger."
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

    // Validate player count
    if (playerCount < 5 || playerCount > 12) {
        throw new Error(`Invalid player count: ${playerCount}. Must be between 5 and 12 players.`);
    }

    // Determine number of werewolves based on player count
    let werewolfCount;
    if (playerCount >= 5 && playerCount <= 9) {
        werewolfCount = 2;
    } else if (playerCount >= 10 && playerCount <= 12) {
        werewolfCount = 3;
    }

    // For 6, 8 and 11 players, the single outsider slot is either
    // Ange or Drunk. The Drunk is represented by the hidden drunk status
    // below, while the player keeps the villager role assigned to them.
    const outsiderChoiceAllowed = [6, 8, 11].includes(playerCount);
    const outsiderChoice = outsiderChoiceAllowed
        ? (Math.random() < 0.5 ? 'ange' : 'drunk')
        : null;
    const angeAllowed = [6, 8, 9, 11, 12].includes(playerCount);
    const includeAnge = angeAllowed && (
        !outsiderChoiceAllowed || outsiderChoice === 'ange'
    );

    // Separate roles by type
    const loupGarouUltime = GAME_ROLES.find(r => r.id === 'loup-garou-ultime');
    const otherWerewolves = GAME_ROLES.filter(r => r.team === 'werewolves' && r.id !== 'loup-garou-ultime');
    const villagers = GAME_ROLES.filter(r => r.team === 'villagers' && r.id !== 'ange');
    const ange = GAME_ROLES.find(r => r.id === 'ange');

    // Build the role pool
    const rolePool = [];

    // Always add Loup Garou Ultime
    rolePool.push(loupGarouUltime);

    // Add additional werewolves (werewolfCount - 1 since we already added Loup Garou Ultime)
    const shuffledWerewolves = shuffleArray(otherWerewolves);
    for (let i = 0; i < werewolfCount - 1; i++) {
        if (shuffledWerewolves[i]) {
            rolePool.push(shuffledWerewolves[i]);
        }
    }

    // Add Ange when this game uses the Angel outsider
    if (includeAnge && ange) {
        rolePool.push(ange);
    }

    // Calculate remaining slots for villagers
    const villagersNeeded = playerCount - rolePool.length;

    // Shuffle and select remaining villagers
    const shuffledVillagers = shuffleArray(villagers);
    for (let i = 0; i < villagersNeeded; i++) {
        if (shuffledVillagers[i]) {
            rolePool.push(shuffledVillagers[i]);
        }
    }

    // Shuffle the final role pool and assign to players
    const finalRoles = shuffleArray(rolePool);
    const assignments = new Map();
    playersToAssignRoles.forEach((player, index) => {
        assignments.set(player.socketId, finalRoles[index]);
    });

    // Randomly select one villager (not werewolf) to be Drunk.
    // For 6, 8 and 11 players this is the alternative to the Angel.
    // Keep the existing Drunk behavior for 9 and 12 players.
    let drunkPlayerSocketId = null;
    const drunkAllowed = outsiderChoice === 'drunk'
        || [9, 12].includes(playerCount);
    if (drunkAllowed) {
        const villagerPlayers = playersToAssignRoles.filter(player => {
            const role = assignments.get(player.socketId);
            return role && role.team === 'villagers' && role.id !== 'ange';
        });

        if (villagerPlayers.length > 0) {
            const randomIndex = Math.floor(Math.random() * villagerPlayers.length);
            drunkPlayerSocketId = villagerPlayers[randomIndex].socketId;
        }
    }

    // If renard is in game, select werewolf info for them
    let renardInfo = null;
    const renardPlayer = playersToAssignRoles.find(player => {
        const role = assignments.get(player.socketId);
        return role && role.id === 'renard';
    });

    if (renardPlayer) {
        // Find all werewolf players (excluding Loup Garou Ultime)
        const werewolfPlayers = playersToAssignRoles.filter(player => {
            const role = assignments.get(player.socketId);
            return role && role.team === 'werewolves' && role.id !== 'loup-garou-ultime';
        });

        if (werewolfPlayers.length > 0) {
            // Randomly select one werewolf
            const selectedWerewolf = werewolfPlayers[Math.floor(Math.random() * werewolfPlayers.length)];
            const werewolfRole = assignments.get(selectedWerewolf.socketId);

            // Select two random players: one is the werewolf, one is not
            // Neither can be the renard player
            const eligiblePlayers = playersToAssignRoles.filter(p => p.socketId !== renardPlayer.socketId);

            // Start with the werewolf player
            const twoPlayers = [selectedWerewolf];

            // Select one more random player (not the werewolf, not the renard)
            const otherPlayers = eligiblePlayers.filter(p => p.socketId !== selectedWerewolf.socketId);
            if (otherPlayers.length > 0) {
                const secondPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
                twoPlayers.push(secondPlayer);
            }

            // Shuffle the two players so we don't always know which is the werewolf
            const shuffledPlayers = shuffleArray(twoPlayers);

            renardInfo = {
                renardSocketId: renardPlayer.socketId,
                werewolfRole: werewolfRole,
                twoPlayerNames: shuffledPlayers.map(p => p.name)
            };
        }
    }

    // If petite fille is in game, select villager info for them
    let petiteFilleInfo = null;
    const petiteFillePlayer = playersToAssignRoles.find(player => {
        const role = assignments.get(player.socketId);
        return role && role.id === 'petite-fille';
    });

    if (petiteFillePlayer) {
        // Find all villager players (excluding petite-fille herself)
        const villagerPlayers = playersToAssignRoles.filter(player => {
            const role = assignments.get(player.socketId);
            return role && role.team === 'villagers' && player.socketId !== petiteFillePlayer.socketId;
        });

        if (villagerPlayers.length > 0) {
            // Randomly select one villager
            const selectedVillager = villagerPlayers[Math.floor(Math.random() * villagerPlayers.length)];
            const villagerRole = assignments.get(selectedVillager.socketId);

            // Select two random players: one is the villager, one is not
            // Neither can be the petite fille player
            const eligiblePlayers = playersToAssignRoles.filter(p => p.socketId !== petiteFillePlayer.socketId);

            // Start with the villager player
            const twoPlayers = [selectedVillager];

            // Select one more random player (not the villager, not the petite fille)
            const otherPlayers = eligiblePlayers.filter(p => p.socketId !== selectedVillager.socketId);
            if (otherPlayers.length > 0) {
                const secondPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
                twoPlayers.push(secondPlayer);
            }

            // Shuffle the two players so we don't always know which is the villager
            const shuffledPlayers = shuffleArray(twoPlayers);

            petiteFilleInfo = {
                petiteFilleSocketId: petiteFillePlayer.socketId,
                villagerRole: villagerRole,
                twoPlayerNames: shuffledPlayers.map(p => p.name)
            };
        }
    }

    // Assign bluff roles to werewolves (villager roles NOT in play)
    const werewolfBluffRoles = new Map();

    // Get all villager roles that are NOT in play
    const rolesInPlay = Array.from(assignments.values());
    const allVillagerRoles = GAME_ROLES.filter(r => r.team === 'villagers');
    const unusedVillagerRoles = allVillagerRoles.filter(vRole =>
        !rolesInPlay.some(inPlayRole => inPlayRole.id === vRole.id)
    );

    // Shuffle unused villager roles
    const shuffledUnusedVillagers = shuffleArray(unusedVillagerRoles);

    // Assign a bluff role to each werewolf
    const werewolfPlayers = playersToAssignRoles.filter(player => {
        const role = assignments.get(player.socketId);
        return role && role.team === 'werewolves';
    });

    werewolfPlayers.forEach((werewolf, index) => {
        if (shuffledUnusedVillagers[index]) {
            werewolfBluffRoles.set(werewolf.socketId, shuffledUnusedVillagers[index]);
        }
    });

    // If voyante is in play, assign one villager (except ange) as decoy
    let voyanteDecoySocketId = null;
    const voyantePlayer = playersToAssignRoles.find(player => {
        const role = assignments.get(player.socketId);
        return role && role.id === 'voyante';
    });

    if (voyantePlayer) {
        // Find all villager players (except ange and voyante herself)
        const eligibleForDecoy = playersToAssignRoles.filter(player => {
            const role = assignments.get(player.socketId);
            return role && role.team === 'villagers' && role.id !== 'ange' && player.socketId !== voyantePlayer.socketId;
        });

        if (eligibleForDecoy.length > 0) {
            const randomDecoy = eligibleForDecoy[Math.floor(Math.random() * eligibleForDecoy.length)];
            voyanteDecoySocketId = randomDecoy.socketId;
        }
    }

    // Generate fake special info for werewolves with renard or petite-fille bluff roles
    const werewolfBluffSpecialInfo = new Map();
    werewolfPlayers.forEach(werewolf => {
        const bluffRole = werewolfBluffRoles.get(werewolf.socketId);
        if (bluffRole && (bluffRole.id === 'renard' || bluffRole.id === 'petite-fille')) {
            // Generate fake info similar to real renard/petite-fille
            const otherPlayers = playersToAssignRoles.filter(p => p.socketId !== werewolf.socketId);

            if (otherPlayers.length >= 2) {
                // Select two random players (excluding the werewolf)
                const shuffledOthers = shuffleArray(otherPlayers);
                const twoPlayers = shuffledOthers.slice(0, 2);

                if (bluffRole.id === 'renard') {
                    // For renard bluff, show a fake werewolf role (not in use would be confusing)
                    // So we show a random werewolf role from all possibilities
                    const fakeWerewolfRoles = GAME_ROLES.filter(r => r.team === 'werewolves' && r.id !== 'loup-garou-ultime');
                    if (fakeWerewolfRoles.length > 0) {
                        const fakeRole = fakeWerewolfRoles[Math.floor(Math.random() * fakeWerewolfRoles.length)];
                        werewolfBluffSpecialInfo.set(werewolf.socketId, {
                            type: 'renard',
                            role: fakeRole,
                            twoPlayerNames: twoPlayers.map(p => p.name)
                        });
                    }
                } else if (bluffRole.id === 'petite-fille') {
                    // For petite-fille bluff, show a villager role that IS actually in play
                    const villagersInPlay = playersToAssignRoles.filter(player => {
                        const role = assignments.get(player.socketId);
                        return role && role.team === 'villagers';
                    });

                    if (villagersInPlay.length > 0) {
                        // Pick a random villager player and use their role
                        const randomVillager = villagersInPlay[Math.floor(Math.random() * villagersInPlay.length)];
                        const villagerRole = assignments.get(randomVillager.socketId);

                        werewolfBluffSpecialInfo.set(werewolf.socketId, {
                            type: 'petite-fille',
                            role: villagerRole,
                            twoPlayerNames: twoPlayers.map(p => p.name)
                        });
                    }
                }
            }
        }
    });

    return { assignments, drunkPlayerSocketId, renardInfo, petiteFilleInfo, werewolfBluffRoles, voyanteDecoySocketId, werewolfBluffSpecialInfo };
}

// Development-only game simulation state. This is deliberately separate from
// gameRooms so test games never modify the real shared room.
const simulatorState = {
    game: null
};

function cloneRole(role) {
    return role ? { ...role } : null;
}

function createSimulatorGame(playerCount) {
    const count = Number(playerCount);
    if (!Number.isInteger(count) || count < 5 || count > 12) {
        throw new Error('Simulator player count must be an integer between 5 and 12.');
    }

    const hostSocketId = 'simulator-host';
    const players = [
        {
            socketId: hostSocketId,
            playerId: 'simulator-host',
            name: 'Le MJ',
            isHost: true
        },
        ...Array.from({ length: count }, (_, index) => ({
            socketId: `simulator-player-${index + 1}`,
            playerId: `simulator-player-${index + 1}`,
            name: `Joueur ${index + 1}`,
            isHost: false
        }))
    ];

    const result = assignRoles(players, hostSocketId);
    const simulatedPlayers = players
        .filter(player => !player.isHost)
        .map(player => {
            const role = result.assignments.get(player.socketId);
            const isDrunk = result.drunkPlayerSocketId === player.socketId;
            const bluffRole = result.werewolfBluffRoles.get(player.socketId);
            const bluffSpecialInfo = result.werewolfBluffSpecialInfo.get(player.socketId);
            const details = [];

            if (bluffRole) {
                details.push({ type: 'bluff', label: 'Rôle de bluff', role: cloneRole(bluffRole) });
            }
            if (bluffSpecialInfo) {
                details.push({
                    type: 'bluff-special',
                    label: 'Information spéciale de bluff',
                    role: cloneRole(bluffSpecialInfo.role),
                    twoPlayerNames: bluffSpecialInfo.twoPlayerNames
                });
            }
            if (role?.id === 'renard' && result.renardInfo) {
                details.push({
                    type: 'renard',
                    label: 'Information du Renard',
                    role: cloneRole(result.renardInfo.werewolfRole),
                    twoPlayerNames: result.renardInfo.twoPlayerNames
                });
            }
            if (role?.id === 'petite-fille' && result.petiteFilleInfo) {
                details.push({
                    type: 'petite-fille',
                    label: 'Information de la Petite Fille',
                    role: cloneRole(result.petiteFilleInfo.villagerRole),
                    twoPlayerNames: result.petiteFilleInfo.twoPlayerNames
                });
            }
            if (result.voyanteDecoySocketId === player.socketId) {
                details.push({ type: 'voyante-decoy', label: 'Leurre de la Voyante' });
            }

            const renardDetails = role?.id === 'renard' && result.renardInfo
                ? {
                    werewolfRole: cloneRole(result.renardInfo.werewolfRole),
                    twoPlayerNames: result.renardInfo.twoPlayerNames
                }
                : null;
            const petiteFilleDetails = role?.id === 'petite-fille' && result.petiteFilleInfo
                ? {
                    villagerRole: cloneRole(result.petiteFilleInfo.villagerRole),
                    twoPlayerNames: result.petiteFilleInfo.twoPlayerNames
                }
                : null;
            const voyanteDecoy = result.voyanteDecoySocketId === player.socketId
                ? 'Leurre de la Voyante'
                : null;

            return {
                playerId: player.playerId,
                name: player.name,
                role: cloneRole(role),
                isDrunk,
                details,
                playerView: {
                    playerName: player.name,
                    name: player.name,
                    role: cloneRole(role),
                    bluffRole: role?.team === 'werewolves' ? cloneRole(bluffRole) : null,
                    bluffSpecialInfo: role?.team === 'werewolves' ? bluffSpecialInfo || null : null
                },
                gameMasterView: {
                    playerName: player.name,
                    socketId: player.socketId,
                    isHost: false,
                    role: cloneRole(role),
                    isDrunk,
                    token: null,
                    renardDetails,
                    petiteFilleDetails,
                    bluffRole: role?.team === 'werewolves' ? cloneRole(bluffRole) : null,
                    voyanteDecoy
                }
            };
        });

    const angelPresent = simulatedPlayers.some(player => player.role?.id === 'ange');
    const drunkPresent = Boolean(result.drunkPlayerSocketId);
    let outsiderSummary = 'Aucun outsider spécial';
    if (count === 6 || count === 8 || count === 11) {
        outsiderSummary = angelPresent ? 'Ange' : 'Ivrogne';
    } else if (angelPresent && drunkPresent) {
        outsiderSummary = 'Ange + Ivrogne';
    } else if (angelPresent) {
        outsiderSummary = 'Ange';
    } else if (drunkPresent) {
        outsiderSummary = 'Ivrogne';
    }

    return {
        id: `simulation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        playerCount: count,
        outsiderSummary,
        players: simulatedPlayers,
        gameMasterView: {
            playerCount: count,
            players: simulatedPlayers.map(player => player.gameMasterView)
        }
    };
}

function getSimulatorState() {
    return {
        enabled: SIMULATOR_ENABLED,
        game: simulatorState.game
            ? {
                id: simulatorState.game.id,
                createdAt: simulatorState.game.createdAt,
                playerCount: simulatorState.game.playerCount,
                outsiderSummary: simulatorState.game.outsiderSummary,
                players: simulatorState.game.players.map(player => ({
                    playerId: player.playerId,
                    name: player.name,
                    role: player.role,
                    type: player.isDrunk || player.role?.id === 'ange'
                        ? 'étranger'
                        : player.role?.team === 'werewolves' ? 'loup garou' : 'villageois'
                }))
            }
            : null
    };
}

function getSimulatorGame(gameId) {
    if (!simulatorState.game || simulatorState.game.id !== gameId) {
        return null;
    }
    return simulatorState.game;
}

app.get('/api/test/simulator/state', simulatorGuard, (req, res) => {
    res.json(getSimulatorState());
});

app.post('/api/test/simulator/reset', simulatorGuard, (req, res) => {
    simulatorState.game = null;
    res.json(getSimulatorState());
});

app.post('/api/test/simulator/game', simulatorGuard, (req, res) => {
    try {
        const game = createSimulatorGame(req.body?.playerCount);
        simulatorState.game = game;
        res.json(getSimulatorState());
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/test/simulator/game/:gameId/mj', simulatorGuard, (req, res) => {
    const game = getSimulatorGame(req.params.gameId);
    if (!game) {
        return res.status(404).json({ error: 'Simulation not found.' });
    }
    res.json({
        gameId: game.id,
        playerCount: game.playerCount,
        outsiderSummary: game.outsiderSummary,
        ...game.gameMasterView
    });
});

app.get('/api/test/simulator/game/:gameId/player/:playerId', simulatorGuard, (req, res) => {
    const game = getSimulatorGame(req.params.gameId);
    if (!game) {
        return res.status(404).json({ error: 'Simulation not found.' });
    }
    const player = game.players.find(item => item.playerId === req.params.playerId);
    if (!player) {
        return res.status(404).json({ error: 'Simulated player not found.' });
    }
    res.json({
        gameId: game.id,
        playerCount: game.playerCount,
        player: player.playerView
    });
});

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

function getAvailableRoom() {
    for (const room of gameRooms.values()) {
        if (!room.gameStarted) {
            return room;
        }
    }
    return null;
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
        this.roleTokens = new Map(); // socketId -> token
    }

    addPlayer(playerId, socketId, playerName, isHost = false) {
        const existingPlayer = this.players.get(playerId);
        const playerData = existingPlayer || {
            playerId,
            name: playerName,
            socketId,
            isHost: false,
            connected: true,
            joinedAt: Date.now(),
            lastSeen: Date.now()
        };

        playerData.name = playerName;
        playerData.socketId = socketId;
        playerData.connected = true;
        playerData.lastSeen = Date.now();
        playerData.isHost = isHost || existingPlayer?.isHost || socketId === this.hostSocketId;

        if (playerData.isHost) {
            this.hostSocketId = socketId;
        }

        this.players.set(playerId, playerData);
        return playerData;
    }

    markPlayerDisconnected(socketId) {
        for (const player of this.players.values()) {
            if (player.socketId === socketId) {
                player.connected = false;
                player.lastSeen = Date.now();

                if (player.isHost && this.hostSocketId === socketId) {
                    const connectedPlayers = this.getPlayers();
                    if (connectedPlayers.length > 0) {
                        const newHost = connectedPlayers[0];
                        newHost.isHost = true;
                        this.hostSocketId = newHost.socketId;
                    }
                }

                return player;
            }
        }
        return null;
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) {
            return null;
        }

        this.players.delete(playerId);

        if (this.players.size > 0) {
            const connectedPlayers = this.getPlayers();
            if (connectedPlayers.length > 0) {
                connectedPlayers.forEach(candidate => {
                    candidate.isHost = false;
                });

                const newHost = connectedPlayers[0];
                newHost.isHost = true;
                this.hostSocketId = newHost.socketId;
            }
        } else {
            this.hostSocketId = null;
        }

        return player;
    }

    getPlayerBySocketId(socketId) {
        return Array.from(this.players.values()).find(player => player.socketId === socketId) || null;
    }

    getPlayers() {
        return Array.from(this.players.values()).filter(player => player.connected);
    }

    cleanupDisconnectedPlayers() {
        const now = Date.now();
        const stalePlayerIds = [];

        this.players.forEach((player, playerId) => {
            if (!player.connected && now - player.lastSeen > 10000) {
                stalePlayerIds.push(playerId);
            }
        });

        stalePlayerIds.forEach(playerId => this.players.delete(playerId));

        const connectedPlayers = this.getPlayers();
        if (connectedPlayers.length > 0 && !connectedPlayers.some(player => player.socketId === this.hostSocketId)) {
            const newHost = connectedPlayers[0];
            newHost.isHost = true;
            this.hostSocketId = newHost.socketId;
        }

        return this.players.size === 0;
    }

    isEmpty() {
        return this.players.size === 0;
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🎮 Player connected: ${socket.id}`);

    // Create or reuse the single shared waiting room
    socket.on('create-room', (data, callback) => {
        const playerName = typeof data === 'string' ? data : data.playerName;
        const playerId = typeof data === 'string' ? `${socket.id}-host` : (data.playerId || `${socket.id}-host`);
        let room = getAvailableRoom();

        if (!room) {
            room = new GameRoom(DEFAULT_ROOM_CODE, socket.id);
            gameRooms.set(DEFAULT_ROOM_CODE, room);
        }

        room.hostSocketId = socket.id;
        room.players.forEach(player => {
            player.isHost = player.socketId === socket.id;
        });

        room.addPlayer(playerId, socket.id, playerName, true);
        room.players.forEach(player => {
            if (player.socketId !== socket.id) {
                player.isHost = false;
            }
        });

        const roomCode = room.code;
        socket.join(roomCode);

        console.log(`🏠 Room ready: ${roomCode} by ${playerName}`);

        callback({
            success: true,
            roomCode: roomCode,
            players: room.getPlayers()
        });
    });

    // Join the shared room or a specific room code
    socket.on('join-room', (data, callback) => {
        const playerName = typeof data === 'string' ? data : data.playerName;
        const { roomCode, isHost = false, playerId } = data;
        const normalizedRoomCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase();
        const room = gameRooms.get(normalizedRoomCode);

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        if (room.gameStarted) {
            callback({ success: false, error: 'Game already started' });
            return;
        }

        const resolvedPlayerId = playerId || `${socket.id}-${Date.now()}`;
        const existingPlayer = room.players.get(resolvedPlayerId);
        const currentRegularPlayerCount = room.getPlayers().filter(player => !player.isHost).length;

        if (!isHost && !existingPlayer && currentRegularPlayerCount >= MAX_NON_HOST_PLAYERS) {
            callback({ success: false, error: `La salle est pleine. Maximum ${MAX_NON_HOST_PLAYERS} joueurs (hors maître du jeu).` });
            return;
        }

        room.addPlayer(resolvedPlayerId, socket.id, playerName, isHost);
        if (isHost) {
            room.hostSocketId = socket.id;
            room.players.forEach(player => {
                player.isHost = player.socketId === socket.id;
            });
        }
        socket.join(normalizedRoomCode);

        console.log(`👋 ${playerName} joined room ${normalizedRoomCode}`);

        io.to(normalizedRoomCode).emit('player-joined', {
            players: room.getPlayers(),
            newPlayer: playerName
        });

        callback({
            success: true,
            roomCode: normalizedRoomCode,
            players: room.getPlayers()
        });
    });

    socket.on('get-room-list', (data, callback) => {
        const room = getAvailableRoom();

        if (!room) {
            callback({
                success: true,
                available: false,
                roomCode: null,
                players: [],
                maxPlayers: MAX_NON_HOST_PLAYERS
            });
            return;
        }

        callback({
            success: true,
            available: true,
            roomCode: room.code,
            players: room.getPlayers(),
            maxPlayers: MAX_NON_HOST_PLAYERS
        });
    });

    socket.on('leave-room', (data, callback) => {
        const roomCode = ((data && data.roomCode) || DEFAULT_ROOM_CODE).toUpperCase();
        const room = gameRooms.get(roomCode);

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        const playerId = data && data.playerId ? data.playerId : null;
        const player = playerId ? room.players.get(playerId) : room.getPlayerBySocketId(socket.id);

        if (player) {
            room.removePlayer(player.playerId);
        }

        socket.leave(roomCode);

        if (room.getPlayers().length > 0) {
            io.to(roomCode).emit('player-left', {
                players: room.getPlayers(),
                leftPlayer: player ? player.name : 'Un joueur'
            });
        }

        socket.emit('room-left', {
            success: true,
            roomCode
        });

        callback({ success: true, roomCode, players: room.getPlayers() });
    });

    socket.on('kick-player', (data, callback) => {
        const roomCode = ((data && data.roomCode) || DEFAULT_ROOM_CODE).toUpperCase();
        const room = gameRooms.get(roomCode);

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        const requester = room.getPlayerBySocketId(socket.id);
        if (!requester || !requester.isHost) {
            callback({ success: false, error: 'Only the host can kick players' });
            return;
        }

        const targetPlayerId = data && data.playerId ? data.playerId : null;
        const targetPlayer = targetPlayerId ? room.players.get(targetPlayerId) : null;

        if (!targetPlayer || targetPlayer.socketId === socket.id) {
            callback({ success: false, error: 'Invalid player to kick' });
            return;
        }

        room.removePlayer(targetPlayer.playerId);

        const targetSocket = io.sockets.sockets.get(targetPlayer.socketId);
        if (targetSocket) {
            targetSocket.leave(roomCode);
            targetSocket.emit('kicked-from-room', {
                success: true,
                message: 'Vous avez été expulsé de la salle.'
            });
        }

        io.to(roomCode).emit('player-left', {
            players: room.getPlayers(),
            leftPlayer: targetPlayer.name
        });

        callback({ success: true, roomCode, players: room.getPlayers() });
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

        const regularPlayerCount = room.getPlayers().filter(player => !player.isHost).length;

        if (regularPlayerCount < MIN_PLAYERS_TO_START) {
            callback({ success: false, error: `Need at least ${MIN_PLAYERS_TO_START} players plus the game master` });
            return;
        }

        if (regularPlayerCount > MAX_NON_HOST_PLAYERS) {
            callback({ success: false, error: `Maximum ${MAX_NON_HOST_PLAYERS} players (excluding the game master)` });
            return;
        }

        // Assign roles before marking the room as started so an invalid configuration
        // cannot leave the shared room stuck in a started state.
        const playersList = room.getPlayers();
        let assignmentResult;
        try {
            assignmentResult = assignRoles(playersList, room.hostSocketId);
        } catch (error) {
            callback({ success: false, error: error.message });
            return;
        }

        room.gameStarted = true;

        const { assignments, drunkPlayerSocketId, renardInfo, petiteFilleInfo, werewolfBluffRoles, voyanteDecoySocketId, werewolfBluffSpecialInfo } = assignmentResult;
        room.roleAssignments = assignments;
        room.drunkPlayerSocketId = drunkPlayerSocketId;
        room.renardInfo = renardInfo;
        room.petiteFilleInfo = petiteFilleInfo;
        room.werewolfBluffRoles = werewolfBluffRoles;
        room.voyanteDecoySocketId = voyanteDecoySocketId;
        room.werewolfBluffSpecialInfo = werewolfBluffSpecialInfo;

        // Generate unique tokens for each player (including game master)
        playersList.forEach(player => {
            const token = crypto.randomBytes(32).toString('hex');
            room.roleTokens.set(player.socketId, token);

            if (player.socketId === room.hostSocketId) {
                // Store game master data (will be updated with players after roleMap is created)
                roleTokens.set(token, {
                    roomCode: roomCode,
                    playerName: player.name,
                    isGameMaster: true,
                    role: null,
                    players: [] // Will be populated below
                });
            } else {
                // Store player role data
                const role = room.roleAssignments.get(player.socketId);
                const tokenData = {
                    roomCode: roomCode,
                    playerName: player.name,
                    isGameMaster: false,
                    role: role
                };

                // Add bluff role if this player is a werewolf
                if (role && role.team === 'werewolves') {
                    const bluffRole = room.werewolfBluffRoles.get(player.socketId);
                    if (bluffRole) {
                        tokenData.bluffRole = bluffRole;
                    }

                    // Add bluff special info if this werewolf has renard/petite-fille bluff
                    const bluffSpecialInfo = room.werewolfBluffSpecialInfo.get(player.socketId);
                    if (bluffSpecialInfo) {
                        tokenData.bluffSpecialInfo = bluffSpecialInfo;
                    }
                }

                roleTokens.set(token, tokenData);
            }
        });

        // Prepare role map for game master (excluding the game master themselves)
        const roleMap = playersList
            .filter(player => player.socketId !== room.hostSocketId)
            .map(player => {
                const role = room.roleAssignments.get(player.socketId);
                const playerToken = room.roleTokens.get(player.socketId);
                const playerData = {
                    playerName: player.name,
                    socketId: player.socketId,
                    isHost: player.isHost,
                    role: role,
                    isDrunk: player.socketId === room.drunkPlayerSocketId,
                    token: playerToken
                };

                // Add renard details if this player is the renard
                if (room.renardInfo && player.socketId === room.renardInfo.renardSocketId) {
                    playerData.renardDetails = {
                        werewolfRole: room.renardInfo.werewolfRole,
                        twoPlayerNames: room.renardInfo.twoPlayerNames
                    };
                }

                // Add petite fille details if this player is the petite fille
                if (room.petiteFilleInfo && player.socketId === room.petiteFilleInfo.petiteFilleSocketId) {
                    playerData.petiteFilleDetails = {
                        villagerRole: room.petiteFilleInfo.villagerRole,
                        twoPlayerNames: room.petiteFilleInfo.twoPlayerNames
                    };
                }

                // Add bluff role if this player is a werewolf
                if (role && role.team === 'werewolves') {
                    const bluffRole = room.werewolfBluffRoles.get(player.socketId);
                    if (bluffRole) {
                        playerData.bluffRole = bluffRole;
                    }
                }

                // Add decoy info if this player is the voyante
                if (role && role.id === 'voyante' && room.voyanteDecoySocketId) {
                    const decoyPlayer = playersList.find(p => p.socketId === room.voyanteDecoySocketId);
                    if (decoyPlayer) {
                        playerData.voyanteDecoy = decoyPlayer.name;
                    }
                }

                return playerData;
            });

        // Update game master token data with players list
        const gmToken = room.roleTokens.get(room.hostSocketId);
        const gmData = roleTokens.get(gmToken);
        if (gmData) {
            gmData.players = roleMap;
        }

        // Send game master view with token
        io.to(room.hostSocketId).emit('game-master-view', {
            players: roleMap,
            token: gmToken
        });

        // Send role tokens to each player (except host)
        playersList.forEach(player => {
            if (player.socketId !== room.hostSocketId) {
                const token = room.roleTokens.get(player.socketId);
                io.to(player.socketId).emit('role-assigned', {
                    token: token
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

        // Mark player as temporarily disconnected so refreshes can reconnect
        for (const [roomCode, room] of gameRooms.entries()) {
            const disconnectedPlayer = room.markPlayerDisconnected(socket.id);
            if (disconnectedPlayer) {
                setTimeout(() => {
                    const currentRoom = gameRooms.get(roomCode);
                    if (!currentRoom) {
                        return;
                    }

                    const isEmpty = currentRoom.cleanupDisconnectedPlayers();
                    if (isEmpty) {
                        gameRooms.delete(roomCode);
                        console.log(`🗑️ Room ${roomCode} deleted (empty)`);
                    }
                }, 10000);

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

    // Keep-alive ping to prevent disconnections (for Replit free tier)
    socket.on('keep-alive', () => {
        // Just acknowledge - this keeps the connection active
        socket.emit('keep-alive-ack');
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
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Loup Garou Ultimate server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 Socket.IO ready for connections`);
});

// Clean up old rooms periodically (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [roomCode, room] of gameRooms.entries()) {
        // Delete rooms older than 4 hours
        if (now - room.createdAt > 4 * 60 * 60 * 1000) {
            gameRooms.delete(roomCode);
            console.log(`🗑️ Room ${roomCode} deleted (timeout)`);
        }
    }
}, 10 * 60 * 1000);