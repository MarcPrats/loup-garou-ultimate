const assert = require('assert');
const { assignRoles } = require('../server');

function makePlayers(playerCount) {
  return [
    { socketId: 'host', playerId: 'host', name: 'Le MJ', isHost: true },
    ...Array.from({ length: playerCount }, (_, index) => ({
      socketId: `player-${index + 1}`,
      playerId: `player-${index + 1}`,
      name: `Joueur ${index + 1}`,
      isHost: false
    }))
  ];
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function assignWithSeed(playerCount, seed) {
  const originalRandom = Math.random;
  Math.random = seededRandom(seed);
  try {
    return {
      players: makePlayers(playerCount),
      result: assignRoles(makePlayers(playerCount), 'host')
    };
  } finally {
    Math.random = originalRandom;
  }
}

let checkedAssignments = 0;
let checkedGamesWithBothMarginaux = 0;

for (const playerCount of [6, 8, 9, 11, 12]) {
  for (let seed = 1; seed <= 1000; seed += 1) {
    const { players, result } = assignWithSeed(playerCount, seed);
    if (!result.petiteFilleInfo) continue;

    checkedAssignments += 1;
    const info = result.petiteFilleInfo;
    const petiteFille = players.find(player => player.socketId === info.petiteFilleSocketId);
    const matchingRoleHolders = players.filter(player => {
      const role = result.assignments.get(player.socketId);
      return role && role.id === info.villagerRole.id;
    });

    assert.strictEqual(info.villagerRole.team, 'villagers');
    assert.notStrictEqual(info.villagerRole.id, 'ange', 'The Ange is a Marginal, not a Petite Fille target');
    assert.ok(petiteFille, 'The Petite Fille player should exist');
    assert.ok(!info.twoPlayerNames.includes(petiteFille.name), 'The Petite Fille cannot point to herself');
    assert.strictEqual(matchingRoleHolders.length, 1, 'The displayed role must have one holder');

    const holder = matchingRoleHolders[0];
    assert.notStrictEqual(
      holder.socketId,
      result.drunkPlayerSocketId,
      'The hidden Ivrogne is a Marginal, not a Petite Fille target'
    );
    assert.ok(
      info.twoPlayerNames.includes(holder.name),
      'One of the two displayed players must hold the displayed Villageois role'
    );

    const angelPresent = Array.from(result.assignments.values()).some(role => role.id === 'ange');
    if (angelPresent && result.drunkPlayerSocketId) checkedGamesWithBothMarginaux += 1;
  }
}

assert.ok(checkedAssignments > 0, 'The seeded games should include the Petite Fille');
assert.ok(checkedGamesWithBothMarginaux > 0, 'The test should cover games containing Ange and Ivrogne');
console.log(`Petite Fille rule passed for ${checkedAssignments} seeded assignments.`);
