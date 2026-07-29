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

function withRandomValue(value, callback) {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function runAssignment(playerCount, randomValue) {
  return withRandomValue(randomValue, () => (
    assignRoles(makePlayers(playerCount), 'host')
  ));
}

function roleFor(result, socketId) {
  return result.assignments.get(socketId);
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

function runAssignmentWithSeed(playerCount, seed) {
  const originalRandom = Math.random;
  Math.random = seededRandom(seed);
  try {
    return assignRoles(makePlayers(playerCount), 'host');
  } finally {
    Math.random = originalRandom;
  }
}

for (let playerCount = 5; playerCount <= 12; playerCount += 1) {
  const result = runAssignment(playerCount, 0.37);
  assert.strictEqual(
    result.assignments.size,
    playerCount,
    `${playerCount} players should receive exactly ${playerCount} assignments`
  );

  const assignedSocketIds = [...result.assignments.keys()];
  assert.strictEqual(
    new Set(assignedSocketIds).size,
    playerCount,
    `${playerCount} players should not receive duplicate assignments`
  );

  const werewolfCount = [...result.assignments.values()]
    .filter(role => role.team === 'werewolves').length;
  const expectedWerewolves = playerCount >= 10 ? 3 : 2;
  assert.strictEqual(
    werewolfCount,
    expectedWerewolves,
    `${playerCount} players should have ${expectedWerewolves} werewolves`
  );
}

for (const playerCount of [6, 8, 11]) {
  const angelResult = runAssignment(playerCount, 0.1);
  const angel = [...angelResult.assignments.entries()]
    .find(([, role]) => role.id === 'ange');
  assert.ok(angel, `${playerCount} players should be able to receive the Angel`);
  assert.strictEqual(
    angelResult.drunkPlayerSocketId,
    null,
    `${playerCount} Angel configuration should not also create a Drunk`
  );

  const drunkResult = runAssignment(playerCount, 0.9);
  assert.ok(
    drunkResult.drunkPlayerSocketId,
    `${playerCount} players should be able to receive the Drunk`
  );
  assert.notStrictEqual(
    roleFor(drunkResult, drunkResult.drunkPlayerSocketId).id,
    'ange',
    `The Angel must never be the Drunk at ${playerCount} players`
  );
}

for (const playerCount of [9, 12]) {
  const result = runAssignment(playerCount, 0.1);
  const angel = [...result.assignments.entries()]
    .find(([, role]) => role.id === 'ange');
  assert.ok(angel, `${playerCount} players should include the Angel`);
  assert.ok(result.drunkPlayerSocketId, `${playerCount} players should include the Drunk`);
  assert.notStrictEqual(
    angel[0],
    result.drunkPlayerSocketId,
    `The Angel and Drunk must be different players at ${playerCount} players`
  );
}


// The Voyante's decoy may be any Villageois or Marginal, including the
// Voyante herself and the Ange. Werewolves must never be selected.
const observedDecoyRoleIds = new Set();
let gamesWithVoyante = 0;
for (let seed = 1; seed <= 1000; seed += 1) {
  const result = runAssignmentWithSeed(9, seed);
  if (!result.voyanteDecoySocketId) continue;

  gamesWithVoyante += 1;
  const decoyRole = roleFor(result, result.voyanteDecoySocketId);
  assert.strictEqual(
    decoyRole.team,
    'villagers',
    `The Voyante decoy must be a Villageois or Marginal, not ${decoyRole.name}`
  );
  observedDecoyRoleIds.add(decoyRole.id);
}

assert.ok(gamesWithVoyante > 0, 'The seeded assignments should include games with the Voyante');
assert.ok(
  observedDecoyRoleIds.has('voyante'),
  'The Voyante herself must be eligible to become the decoy'
);
assert.ok(
  observedDecoyRoleIds.has('ange'),
  'The Ange must be eligible to become the decoy'
);

console.log('Role-assignment tests passed for 5 to 12 players.');