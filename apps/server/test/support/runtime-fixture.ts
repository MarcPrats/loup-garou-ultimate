import { LobbyService } from '../../src/application/lobby-service'
import { InMemoryRoomRepository } from '../../src/infrastructure/in-memory-room-repository'
import {
  DeterministicAssignmentGenerator,
  FakeClock,
  PlayerIdSequence,
  RoleAccessTokenSequence,
  SessionTokenSequence,
} from './fakes'

export function createServiceForTest(): LobbyService {
  return new LobbyService({
    repository: new InMemoryRoomRepository(),
    clock: new FakeClock(),
    playerIdGenerator: new PlayerIdSequence(),
    sessionTokenGenerator: new SessionTokenSequence(),
    roleAccessTokenGenerator: new RoleAccessTokenSequence(),
    assignmentGenerator: new DeterministicAssignmentGenerator(),
  })
}
