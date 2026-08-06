import { LobbyService } from '../../src/application/lobby-service'
import { InMemoryLobbyRepository } from '../../src/infrastructure/in-memory-lobby-repository'
import {
  DeterministicAssignmentGenerator,
  FakeClock,
  PlayerIdSequence,
  RoleAccessTokenSequence,
  SessionTokenSequence,
} from './fakes'

export function createServiceForTest(): LobbyService {
  return new LobbyService({
    repository: new InMemoryLobbyRepository(),
    clock: new FakeClock(),
    playerIdGenerator: new PlayerIdSequence(),
    sessionTokenGenerator: new SessionTokenSequence(),
    roleAccessTokenGenerator: new RoleAccessTokenSequence(),
    assignmentGenerator: new DeterministicAssignmentGenerator(),
  })
}
