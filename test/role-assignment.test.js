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

console.log('Role-assignment tests passed for 5 to 12 players.');